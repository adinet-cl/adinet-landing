---
title: Checklist de Aceptación y Matriz de Aseguramiento
navTitle: Aceptación y Aseguramiento
description: Controles de ingeniería requeridos para aprobar un pase a producción y matriz de evidencia candidata mapeada a ISO/IEC 27001:2022, SOC 2 y NIST CSF 2.0.
section: operations
order: 4
---

Un despliegue está listo para entrar a ventana productiva únicamente cuando cada control obligatorio cuenta con responsable asignado, evidencia fechada y aprobación formal de riesgo.

> **Declaración explícita de alcance**: Autorix es software open source y **no** está certificado bajo ISO/IEC 27001, SOC 2, PCI DSS ni normativas bancarias. Los controles del repositorio y las exportaciones de evidencia apoyan el programa de aseguramiento del operador, pero la eficacia operativa y cualquier certificación corresponden exclusivamente a la organización que lo despliega.

## Checklist de Aceptación para Producción

### Identidad del Release y Cadena de Suministro

- [ ] El registro del release incluye commit SHA, timestamp de compilación, digests OCI verificados, SBOM y resultados de escaneo de vulnerabilidades (0 CVEs críticos).
- [ ] Las imágenes están firmadas criptográficamente y la política de admisión del clúster verifica firma y digest.
- [ ] Pasan todas las verificaciones de CI: pruebas unitarias, integración, detección de carreras, render Helm y límites de seguridad.
- [ ] Un revisor independiente aprobó el diff productivo y el ticket de cambio.

### Identidad, Autorización y Criptografía

- [ ] Emisor productivo, URIs de redirección, orígenes CORS, audiencias de recurso y upstreams de Aegis están explícitamente permitidos y revisados.
- [ ] Los listeners administrativos (`:4445`, `:4456`, `:4400`) son privados y están protegidos por autenticación interna, RBAC, NetworkPolicies y auditoría.
- [ ] Todas las claves de firma, credenciales de base de datos y secretos internos provienen de un gestor de secretos aprobado (cero credenciales por defecto).
- [ ] Se ensayaron rotación de claves, revocación de emergencia y renovación JWKS sin interrumpir la verificación de tokens.

### Plataforma, Resiliencia y Respuesta a Incidentes

- [ ] PostgreSQL exige TLS verificado (`sslmode=verify-full`), cuentas de mínimo privilegio, almacenamiento cifrado y pruebas exitosas de restauración dentro del RTO/RPO aprobado.
- [ ] Están validados TLS de Ingress, HSTS, límites de tasa y protecciones WAF/DDoS.
- [ ] Tableros y alertas cubren fallos de autenticación, denegaciones, errores de ciclo de vida de claves, saturación de BD e integridad del registro de auditoría.
- [ ] Existen modelo de amenazas actualizado, prueba de penetración independiente y artefacto de rollback verificado.

## Matriz de Evidencia de Aseguramiento

| Objetivo de Aseguramiento | ISO/IEC 27001:2022 | SOC 2 | NIST CSF 2.0 | Evidencia Candidata en Repositorio | Evidencia Operativa del Operador |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Control de acceso y mínimo privilegio** | Anexo A 5.15, 5.18, 8.2, 8.3 | CC6.1–CC6.3 | Protect (`PR.AA`) | Motores ReBAC/ABAC, administración privada, guardias CI | Ciclo de vida de identidades, MFA obligatorio, revisiones periódicas |
| **Autenticación y protección de credenciales** | Anexo A 5.17, 8.5 | CC6.1, CC6.6 | Protect (`PR.AA`, `PR.DS`) | Argon2id/TOTP/WebAuthn en Ego, OAuth2/PKCE en Janus, validación JWT en Aegis | Políticas de contraseñas/MFA, inventario de secretos, custodia de claves |
| **Configuración segura y endurecimiento** | Anexo A 8.9, 8.20, 8.22 | CC6.6, CC7.1 | Protect (`PR.PS`, `PR.IR`) | SecurityContexts Helm, NetworkPolicies, autenticación interna del clúster | Líneas base de admisión, revisiones de configuración, pruebas de egreso |
| **Gestión criptográfica de claves** | Anexo A 8.24 | CC6.1, CC6.7 | Protect (`PR.DS`) | Claves RS256 persistidas en Janus, rotación JWKS, firma HMAC de identidad | Diseño HSM/KMS, separación de funciones, ceremonias y ensayos de revocación |
| **Registro, monitoreo y auditabilidad** | Anexo A 8.15–8.17 | CC7.1, CC7.2 | Detect (`DE.CM`), Govern (`GV.OC`) | Cadena SHA-256 en Argus, `/metrics`, verificación en runbook | Retención centralizada en SIEM, sincronización horaria, pruebas de alertas |
| **Gestión de vulnerabilidades y cambios** | Anexo A 8.8, 8.32 | CC7.1, CC8.1 | Identify (`ID.RA`), Govern (`GV.RM`) | Pipelines CI, escaneos Grype, `SECURITY.md`, checklist de release | Procedencia SBOM, SLAs de remediación, aprobaciones CAB |
| **Respuesta a incidentes y recuperación** | Anexo A 5.24–5.30, 8.13 | A1.2, CC7.3–7.5 | Respond (`RS.*`), Recover (`RC.RP`) | Política de divulgación, procedimientos de respaldo y restauración | Guardias on-call, simulacros de mesa, restauraciones cifradas verificadas |

## Siguiente Paso

Explora las decisiones arquitectónicas en [ADR 0001: Contrato Uniforme de Salud](/autorix/reference/adr-health-contract).
