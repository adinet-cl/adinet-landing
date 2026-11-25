---
title: Transición a Producción, Migración de Seguridad y Rollback
navTitle: Transición y Rollback
description: Migración controlada desde Docker Compose hacia Kubernetes con digests inmutables, límites de confianza JWT, listeners privados de administración y ensayos de actualización y rollback.
section: operations
order: 3
---

El paso desde Docker Compose local hacia Kubernetes/Helm implica adoptar un modelo operativo inmutable, fijado por digest y Zero-Trust. Completa cada paso primero en un entorno de staging equivalente a producción.

## Flujo de Transición a Producción

1. **Cadena de Suministro y Fijación de Imágenes**: Compila, escanea, firma y registra digests OCI SHA-256 inmutables desde `ghcr.io/autorix-cl/*`. El renderizado productivo de Helm falla intencionalmente hasta fijar un digest real en cada carga.
2. **PostgreSQL y Secretos**: Aprovisiona PostgreSQL con TLS (`sslmode=verify-full`), URLs por servicio respaldadas por gestor de secretos, tokens internos y procedimientos probados de restauración. Nunca guardes contraseñas en archivos `values`.
3. **Límites de Administración Privada**: Comprueba que ni Janus `:4445` ni Aegis `:4456` sean accesibles por Ingress público y verifica los selectores `networkPolicy.ingressController` y `networkPolicy.monitoring`.
4. **Guardias de Validación**: Ejecuta `python3 scripts/ci/check_security_boundaries.py` y las suites de pruebas antes de promover cualquier versión. Verifica externamente que `/admin/clients` en Janus `:4444` responde `404`.
5. **Ensayos Previos**: Ejecuta prueba de humo, ensayo de restauración desde respaldo cifrado y simulacro de rollback antes de aceptar tráfico real.

## Matriz de Variables de Confianza JWT y Administración Privada

| Variable | Propósito y Restricción |
| :--- | :--- |
| `JWT_ISSUER` | Valor exacto esperado en `iss`; debe coincidir con `ISSUER_URL` de Janus |
| `JWT_AUDIENCE` | Valor exacto esperado en `aud`; por defecto coincide con la audiencia M2M del emisor |
| `JWT_JWKS_URL` | Endpoint HTTPS JWKS bajo control del operador; nunca seleccionable por regla o petición |
| `JWT_ALLOW_INSECURE_JWKS` | Por defecto `false`; usar `true` solo en Docker Compose local |
| `JANUS_INTERNAL_URL` | Dirección interna del BFF de Console para JWKS / introspección / revocación |
| `JANUS_ADMIN_INTERNAL_URL` | Dirección interna del BFF de Console para `/admin/*`; **nunca** exponer como `NEXT_PUBLIC_*` |
| `CORS_ALLOWED_ORIGINS` | Lista explícita de orígenes permitidos en Janus (nunca `*`) |
| `PROMETHEUS_INTERNAL_URL` | URL interna opcional de Prometheus para observabilidad en Console (`v0.2.8+`) |

> **Aislamiento de audiencias**: Los access tokens `client_credentials` de Janus llevan el emisor como audiencia, mientras que los tokens `authorization_code` y los ID tokens usan el `client_id`. No amplíes la audiencia de Aegis sin aplicar audiencias de recurso (`RFC 8707`) y separación estricta `token_use: access_token`.

## Actualizaciones Controladas

Registra commit SHA, valores Helm, digests de imagen, versión de migración, aprobador y responsable de rollback antes de iniciar:

1. Revisa las notas de versión ([CHANGELOG](https://github.com/Autorix-cl/autorix/blob/main/CHANGELOG.md)) y el diff renderizado de Helm con el archivo de digests fijados.
2. Respalda todas las bases de datos y valida la restauración en un entorno aislado.
3. Aplica migraciones SQL retrocompatibles mediante el hook del chart de Helm y despliega las nuevas cargas.
4. Verifica `/health/ready`, flujos OAuth2, reglas Aegis, administración en Console, métricas y entrega de alertas.

## Procedimiento de Rollback

1. Detén o drena el despliegue si es seguro hacerlo.
2. Revierte el release de Helm al **digest inmutable** y valores previamente aprobados; nunca cambies a una etiqueta mutable.
3. **No reviertas esquemas de base de datos a ciegas.** Restaura desde respaldo verificado únicamente cuando el plan de migración lo contemple y el comandante de incidente apruebe el riesgo de pérdida de datos.
4. Repite las pruebas de humo y documenta cronología, evidencia y acciones de seguimiento.

## Siguiente Paso

Valida los criterios de salida a producción en la [Lista de Aceptación y Matriz de Aseguramiento](/autorix/operations/production-assurance).
