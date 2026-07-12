import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { Usuario, PapelUsuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

const PAPEIS = ["ADMIN", "ALMOXARIFADO"] as const;

// Campos expostos à tela Admin — NUNCA o authUserId (interno do Supabase).
const SELECAO_USUARIO = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  criadoEm: true,
} as const;

class CreateUsuarioDto {
  @IsString() nome!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) senha!: string;
  @IsIn(PAPEIS) papel!: PapelUsuario;
}

class UpdateUsuarioDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsIn(PAPEIS) papel?: PapelUsuario;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

@Injectable()
class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(tenantId: string) {
    return this.prisma.usuario.findMany({
      where: { tenantId },
      orderBy: { nome: "asc" },
      select: SELECAO_USUARIO,
    });
  }

  /**
   * Papel/ativo/nome. Trava anti-lockout: o admin não pode despromover nem
   * desativar A PRÓPRIA conta — sempre resta ao menos ele para reverter.
   * Efeito colateral aceito: o cache do AuthGuard segura o estado anterior
   * por até 60s após a mudança.
   */
  async atualizar(tenantId: string, editor: Usuario, id: string, dto: UpdateUsuarioDto) {
    if (id === editor.id && (dto.ativo === false || (dto.papel && dto.papel !== "ADMIN"))) {
      throw new BadRequestException("Você não pode desativar ou despromover a própria conta de administrador.");
    }
    const { count } = await this.prisma.usuario.updateMany({
      where: { id, tenantId },
      data: dto,
    });
    if (count === 0) throw new NotFoundException("Usuário não encontrado.");
    return this.prisma.usuario.findFirst({ where: { id, tenantId }, select: SELECAO_USUARIO });
  }

  /**
   * Cria o LOGIN (Supabase Auth, via service role) + a linha `usuarios` do
   * tenant do admin. O e-mail nasce confirmado: quem entrega a senha inicial
   * é o dono, pessoalmente — não há fluxo de convite por e-mail (escopo).
   */
  async criar(tenantId: string, dto: CreateUsuarioDto) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new ServiceUnavailableException(
        "Criação de login indisponível: SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.",
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new ConflictException(`Não foi possível criar o login: ${error?.message ?? "erro desconhecido"}.`);
    }

    try {
      return await this.prisma.usuario.create({
        data: {
          tenantId,
          authUserId: data.user.id,
          nome: dto.nome,
          email: dto.email,
          papel: dto.papel,
        },
        select: SELECAO_USUARIO,
      });
    } catch (err) {
      // Login criado mas a linha falhou (ex.: e-mail duplicado no tenant):
      // desfaz o login para não deixar conta órfã no Supabase Auth.
      await admin.auth.admin.deleteUser(data.user.id).catch(() => {
        /* melhor esforço: a conta órfã não loga (guard exige linha em usuarios) */
      });
      throw err instanceof Error && err.message.includes("Unique constraint")
        ? new ConflictException("Já existe um usuário com este e-mail nesta oficina.")
        : err;
    }
  }
}

// Gestão de quem loga — exclusiva do dono (mesma trava do recurso admin).
@Roles("ADMIN")
@Controller("usuarios")
class UsuariosController {
  constructor(private readonly s: UsuariosService) {}

  @Get()
  @Permissao("admin", "VER")
  list(@CurrentUsuario() u: Usuario) {
    return this.s.listar(u.tenantId);
  }

  @Post()
  @Permissao("admin", "CRIAR")
  create(@CurrentUsuario() u: Usuario, @Body() dto: CreateUsuarioDto) {
    return this.s.criar(u.tenantId, dto);
  }

  @Patch(":id")
  @Permissao("admin", "EDITAR")
  update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateUsuarioDto) {
    return this.s.atualizar(u.tenantId, u, id, dto);
  }
}

@Module({ controllers: [UsuariosController], providers: [UsuariosService] })
export class UsuariosModule {}
