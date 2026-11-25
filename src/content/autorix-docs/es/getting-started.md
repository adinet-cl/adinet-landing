---
title: Inicio Rápido con Docker Compose
navTitle: Inicio Rápido (Docker)
description: Levanta el stack local de Autorix Zero-Trust IAM con Docker Compose v2, genera secretos locales, reclama el administrador raíz de Argus y verifica la salud de los servicios.
section: overview
order: 2
---

> **Solo para desarrollo y evaluación local**: Docker Compose utiliza puertos locales, credenciales de desarrollo, HTTP entre servicios y PostgreSQL con `sslmode=disable`. No debe exponerse a Internet ni tratarse como un despliegue en producción.

## Requisitos Previos

- Docker Engine con **Compose v2**
- Al menos **8 GB de RAM** disponibles para Docker
- Puertos locales `3000`, `4400`, `4433`, `4444`, `4455`, `5432` y `8080` libres

## Perfiles de Compose

Autorix divide su definición de Docker Compose en tres perfiles componibles para levantar solo los componentes necesarios:

| Perfil | Servicios Incluidos | Propósito |
| :--- | :--- | :--- |
| `core` | `postgres`, `redis`, `argus`, `nexus`, `ego`, `janus`, `aegis`, `console` | Núcleo IAM, OAuth2/OIDC, ReBAC, proxy PEP, plano de control y Consola |
| `extended` | `vulcan`, `hermes`, `themis`, `prometheus`, `docs` | API keys Macaroon, federación SAML/SCIM, motor ABAC CEL y métricas |
| `alerts` | `alertmanager` | Enrutamiento opcional de alertas autogestionado (requiere configuración propia) |

## Iniciar el Stack Base

1. **Genera los secretos locales no versionados** antes de cada instalación nueva (nunca subas el archivo `.env` ni los secretos generados a Git):

```bash
./scripts/generate-local-secrets.sh
```

2. **Construye e inicia el clúster base**:

```bash
docker compose --profile core up -d --build
docker compose --profile core ps
```

Para levantar la suite completa de 9 servicios (incluyendo Vulcan, Hermes, Themis y Prometheus):

```bash
docker compose --profile core --profile extended up -d --build
```

## Bootstrap Inicial y Propietario Raíz

Al arrancar Argus sobre una base de datos vacía, inicializa automáticamente los entornos por defecto (`production`, `staging`, `development`) y emite un token único de bootstrap (`abt_...`).

1. **Recupera el token de bootstrap** desde los registros de Argus:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

2. Abre **[http://localhost:3000](http://localhost:3000)** en tu navegador. Si aún no existe un propietario raíz, Console te redirige automáticamente al asistente `/setup`.
3. Ingresa el token `abt_...` y crea la cuenta del Administrador Maestro.
4. Una vez completado el registro, el token queda invalidado permanentemente, el clúster queda bloqueado y serás redirigido a `/login`.

> Nunca copies tokens de bootstrap ni contraseñas en el control de versiones, historial de terminal o tickets compartidos.

## Verificar Salud Local

Todos los microservicios Go exponen el contrato uniforme `/health/alive`, `/health/ready` e `/info`:

```bash
curl -fsS http://localhost:4444/health/ready  # API pública OAuth2/OIDC de Janus
curl -fsS http://localhost:4455/health/ready  # Proxy PEP de Aegis
curl -fsS http://localhost:4400/health/ready  # Plano de control Argus
curl -fsS http://localhost:8080/health/ready  # Motor ReBAC Nexus
curl -fsS http://localhost:4433/health/ready  # Motor de identidades Ego
```

## Límites de Administración Privada

Los puertos administrativos de Janus (`:4445`) y Aegis (`:4456`) **no se publican intencionalmente** en Docker Compose. Adminístralos a través del BFF autenticado de Console o mediante `docker compose exec` dentro de la red interna; no agregues mapeos de puerto de host para estos listeners.

## Ejecutar Pruebas Automatizadas en Local

```bash
# Ejecutar pruebas unitarias en los 8 microservicios Go
for dir in argus nexus ego janus aegis vulcan hermes themis; do
  (cd "$dir" && go test -v ./...)
done

# Ejecutar pruebas unitarias y compilación de producción de Console
(cd console && npm test && npm run build)

# Ejecutar pruebas de aceptación E2E con Playwright
(cd console && npx playwright test)
```

## Siguiente Paso

Revisa la [Arquitectura Maestra y Pipeline](/autorix/architecture) y la [Configuración de Seguridad](/autorix/security-configuration) antes de integrar tu primera aplicación.
