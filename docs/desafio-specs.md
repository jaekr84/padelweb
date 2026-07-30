# Módulo Desafío — Especificación

## 1. Concepto

Un **Desafío** es un evento de duración abierta, atado a una categoría, donde los jugadores se inscriben solos o en pareja, juegan partidos de a dos en las canchas disponibles, y **los puntos se acreditan siempre al jugador individual**. La pareja es un vínculo temporal y desarmable; el punto, una vez confirmado, es del jugador.

## 2. Reglas cerradas

| Regla | Definición |
|---|---|
| Participación | 1 punto único por desafío, al inscribirse |
| Victoria | 3 puntos a cada jugador del equipo ganador |
| Derrota | 0 puntos, pero el partido se registra igual |
| Parejas | Dinámicas: armar, desarmar y rearmar sin límite |
| Desempate | 1º partidos ganados · 2º diferencia de games |
| Categoría | Obligatoria en el desafío y en el perfil del jugador |
| Jugar para arriba | Permitido (categoría igual o inferior a la del desafío) |
| Excepciones | El admin puede inscribir a mano salteando la validación |
| Tope de partidos | Sin tope |
| Repetir rival o pareja | Permitido |
| Carga de resultado | La cargan los jugadores, la confirma el admin |
| Cola de espera | Sí, cuando no hay canchas libres |
| Cierre | Manual, bloqueado si hay partidos sin confirmar |

## 3. Schema Prisma

```prisma
enum LadoCancha {
  DRIVE
  REVES
  AMBOS
}

enum EstadoDesafio {
  BORRADOR
  ABIERTO
  CERRADO
}

enum EstadoInscripcion {
  DISPONIBLE
  EMPAREJADO
  JUGANDO
  BAJA
}

enum EstadoCancha {
  LIBRE
  OCUPADA
  INHABILITADA
}

enum EstadoPartido {
  EN_CURSO
  RESULTADO_CARGADO
  CONFIRMADO
  RECHAZADO
  CANCELADO
}

enum EstadoCola {
  ESPERANDO
  ASIGNADA
  CANCELADA
}

enum TipoPuntaje {
  PARTICIPACION
  VICTORIA
  DERROTA
}

/// Categorías del club. `orden` menor = categoría más alta (1ª es la mejor).
model Categoria {
  id        String   @id @default(cuid())
  nombre    String   // "1ª", "2ª", "3ª"...
  orden     Int      @unique
  activa    Boolean  @default(true)

  desafios      Desafio[]
  perfiles      PerfilJugador[]
  inscripciones DesafioInscripcion[]
}

/// Configuración de la cuenta del jugador.
/// categoriaId y lado son OBLIGATORIOS en el alta.
model PerfilJugador {
  id          String     @id @default(cuid())
  userId      String     @unique
  user        User       @relation(fields: [userId], references: [id])
  categoriaId String
  categoria   Categoria  @relation(fields: [categoriaId], references: [id])
  lado        LadoCancha

  @@index([categoriaId])
}

model Desafio {
  id          String        @id @default(cuid())
  nombre      String
  descripcion String?
  estado      EstadoDesafio @default(BORRADOR)

  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])

  puntosParticipacion Int @default(1)
  puntosVictoria      Int @default(3)
  puntosDerrota       Int @default(0)

  abiertoEn  DateTime?
  cerradoEn  DateTime?
  creadoEn   DateTime @default(now())

  canchas       DesafioCancha[]
  inscripciones DesafioInscripcion[]
  parejas       DesafioPareja[]
  partidos      DesafioPartido[]
  puntajes      DesafioPuntaje[]
  cola          DesafioCola[]

  @@index([estado, categoriaId])
}

model DesafioCancha {
  id        String       @id @default(cuid())
  desafioId String
  desafio   Desafio      @relation(fields: [desafioId], references: [id], onDelete: Cascade)
  numero    Int
  nombre    String?
  estado    EstadoCancha @default(LIBRE)

  /// UNIQUE + nullable: la base impide que dos partidos tomen la misma cancha
  partidoActualId String?         @unique
  partidoActual   DesafioPartido? @relation("CanchaOcupada", fields: [partidoActualId], references: [id])

  partidos DesafioPartido[] @relation("PartidosDeCancha")

  @@unique([desafioId, numero])
}

model DesafioInscripcion {
  id      String @id @default(cuid())
  desafioId String
  desafio   Desafio @relation(fields: [desafioId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id])

  /// Snapshots del perfil al momento de inscribirse.
  /// Si el jugador cambia su config después, el desafío no se ve afectado.
  lado        LadoCancha
  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])

  estado      EstadoInscripcion @default(DISPONIBLE)
  esExcepcion Boolean           @default(false)
  inscriptoEn DateTime          @default(now())

  @@unique([desafioId, userId])
  @@index([desafioId, estado])
}

model DesafioPareja {
  id        String  @id @default(cuid())
  desafioId String
  desafio   Desafio @relation(fields: [desafioId], references: [id], onDelete: Cascade)

  jugadorAId String
  jugadorA   User   @relation("ParejaJugadorA", fields: [jugadorAId], references: [id])
  jugadorBId String
  jugadorB   User   @relation("ParejaJugadorB", fields: [jugadorBId], references: [id])

  activa     Boolean   @default(true)
  creadaEn   DateTime  @default(now())
  disueltaEn DateTime?

  partidosEq1 DesafioPartido[] @relation("Pareja1")
  partidosEq2 DesafioPartido[] @relation("Pareja2")
  cola        DesafioCola[]

  @@index([desafioId, activa])
}

model DesafioPartido {
  id        String  @id @default(cuid())
  desafioId String
  desafio   Desafio @relation(fields: [desafioId], references: [id], onDelete: Cascade)

  canchaId String
  cancha   DesafioCancha @relation("PartidosDeCancha", fields: [canchaId], references: [id])
  canchaOcupada DesafioCancha? @relation("CanchaOcupada")

  /// Los 4 jugadores desnormalizados: el historial sobrevive
  /// aunque las parejas se disuelvan o se rearmen distinto.
  eq1JugadorAId String
  eq1JugadorA   User   @relation("Eq1A", fields: [eq1JugadorAId], references: [id])
  eq1JugadorBId String
  eq1JugadorB   User   @relation("Eq1B", fields: [eq1JugadorBId], references: [id])
  eq2JugadorAId String
  eq2JugadorA   User   @relation("Eq2A", fields: [eq2JugadorAId], references: [id])
  eq2JugadorBId String
  eq2JugadorB   User   @relation("Eq2B", fields: [eq2JugadorBId], references: [id])

  /// Referencia histórica a las parejas que jugaron
  pareja1Id String?
  pareja1   DesafioPareja? @relation("Pareja1", fields: [pareja1Id], references: [id])
  pareja2Id String?
  pareja2   DesafioPareja? @relation("Pareja2", fields: [pareja2Id], references: [id])

  estado EstadoPartido @default(EN_CURSO)

  /// Resultado por sets, ej: [{eq1: 6, eq2: 4}, {eq1: 3, eq2: 6}, {eq1: 7, eq2: 5}]
  sets       Json?
  gamesEq1   Int?
  gamesEq2   Int?
  ganadorEq  Int?    // 1 o 2

  cargadoPorId   String?
  cargadoPor     User?     @relation("CargadoPor", fields: [cargadoPorId], references: [id])
  confirmadoPorId String?
  confirmadoPor   User?    @relation("ConfirmadoPor", fields: [confirmadoPorId], references: [id])
  motivoRechazo   String?

  iniciadoEn    DateTime  @default(now())
  cargadoEn     DateTime?
  confirmadoEn  DateTime?

  puntajes DesafioPuntaje[]

  @@index([desafioId, estado])
}

model DesafioCola {
  id        String  @id @default(cuid())
  desafioId String
  desafio   Desafio @relation(fields: [desafioId], references: [id], onDelete: Cascade)

  parejaId String
  pareja   DesafioPareja @relation(fields: [parejaId], references: [id])

  /// Rival elegido de antemano (opcional: puede anotarse a esperar sin rival)
  parejaRivalId String?

  posicion    Int
  estado      EstadoCola @default(ESPERANDO)
  ingresoEn   DateTime   @default(now())
  asignadaEn  DateTime?

  @@index([desafioId, estado, posicion])
}

/// El ledger. El ranking sale de acá y de ningún otro lado.
model DesafioPuntaje {
  id        String  @id @default(cuid())
  desafioId String
  desafio   Desafio @relation(fields: [desafioId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id])

  tipo      TipoPuntaje
  puntos    Int

  partidoId String?
  partido   DesafioPartido? @relation(fields: [partidoId], references: [id])

  creadoEn  DateTime @default(now())

  /// Un solo punto de participación por jugador por desafío
  @@unique([desafioId, userId, tipo, partidoId])
  @@index([desafioId, userId])
}
```

## 4. Máquinas de estado

### Partido

```
EN_CURSO ──(jugador carga)──► RESULTADO_CARGADO ──(admin confirma)──► CONFIRMADO
                                      │
                                      └──(admin rechaza)──► RECHAZADO ──► EN_CURSO

EN_CURSO ──(admin cancela)──► CANCELADO
```

- La cancha se libera al llegar a `RESULTADO_CARGADO` (no hace falta esperar al admin para que otros jueguen).
- El ledger se escribe **solo** en la transición a `CONFIRMADO`.
- `RECHAZADO` vuelve el partido a editable, sin tocar la cancha.

### Jugador dentro del desafío

```
DISPONIBLE ⇄ EMPAREJADO ⇄ JUGANDO
```

Vuelve a `EMPAREJADO` cuando el partido pasa a `RESULTADO_CARGADO`, no cuando lo confirma el admin.

### Desafío

```
BORRADOR ──► ABIERTO ⇄ CERRADO
```

La categoría se puede editar solo en `BORRADOR` o mientras no haya inscriptos.

## 5. Transacciones críticas

### Iniciar partido

```
BEGIN
  verificar desafio.estado = ABIERTO
  verificar cancha.estado = LIBRE
  verificar las 2 parejas activas y sus 4 jugadores en EMPAREJADO
  crear partido (EN_CURSO, los 4 jugadores desnormalizados)
  cancha.partidoActualId = partido.id   ← el UNIQUE acá es el candado
  cancha.estado = OCUPADA
  4 inscripciones → JUGANDO
  si venían de la cola: entrada → ASIGNADA, recomputar posiciones
COMMIT
```

Si dos parejas tocan "jugar" en la misma cancha al mismo tiempo, el UNIQUE sobre `partidoActualId` hace fallar la segunda transacción. No hace falta lock aplicativo.

### Cargar resultado (jugador)

```
BEGIN
  verificar que el usuario es uno de los 4 del partido
  verificar partido.estado ∈ {EN_CURSO, RECHAZADO}
  guardar sets, gamesEq1, gamesEq2, ganadorEq, cargadoPorId
  partido.estado = RESULTADO_CARGADO
  cancha.partidoActualId = null, cancha.estado = LIBRE
  4 inscripciones → EMPAREJADO
COMMIT
→ después del commit: intentar asignar cancha al primero de la cola
```

### Confirmar resultado (admin) — acá se escriben los puntos

```
BEGIN
  verificar partido.estado = RESULTADO_CARGADO
  partido.estado = CONFIRMADO, confirmadoPorId, confirmadoEn
  insertar 4 filas en DesafioPuntaje:
    2 × VICTORIA (3 pts) a los del equipo ganador
    2 × DERROTA  (0 pts) a los del perdedor
COMMIT
```

El `@@unique([desafioId, userId, tipo, partidoId])` hace la operación idempotente: doble clic en confirmar no duplica puntos.

### Inscribir jugador

```
BEGIN
  verificar desafio.estado = ABIERTO
  leer perfil.categoria y perfil.lado
  si NO es excepción del admin:
    verificar perfil.categoria.orden >= desafio.categoria.orden
    (orden mayor = categoría más baja → puede jugar para arriba, nunca para abajo)
  crear inscripción con snapshot de lado y categoría
  insertar DesafioPuntaje PARTICIPACION (1 pt, partidoId = null)
COMMIT
```

### Desarmar pareja

```
BEGIN
  verificar que ninguno de los 2 esté en JUGANDO   ← si no, se rechaza
  pareja.activa = false, disueltaEn = now()
  ambas inscripciones → DISPONIBLE
  si la pareja estaba en cola: entrada → CANCELADA
COMMIT
```

Los puntajes ya escritos no se tocan nunca. Esa es la razón por la que el ledger es individual.

### Cerrar desafío

```
BEGIN
  contar partidos con estado ∈ {EN_CURSO, RESULTADO_CARGADO}
  si > 0 → rechazar, listar cuáles y qué falta de cada uno
  desafio.estado = CERRADO, cerradoEn = now()
COMMIT
```

Los `RESULTADO_CARGADO` bloquean igual que los `EN_CURSO`: si no, se cierra el desafío con puntos que nunca entraron al ranking.

## 6. Ranking

```sql
SELECT
  p.user_id,
  SUM(p.puntos)                                        AS puntos,
  COUNT(*) FILTER (WHERE p.tipo = 'VICTORIA')          AS ganados,
  COUNT(*) FILTER (WHERE p.tipo IN ('VICTORIA','DERROTA')) AS jugados
FROM desafio_puntaje p
WHERE p.desafio_id = $1
GROUP BY p.user_id
ORDER BY puntos DESC, ganados DESC;
```

Diferencia de games como tercer criterio sale del join con `DesafioPartido`, calculando a favor y en contra según de qué lado estuvo el jugador en cada partido.

## 7. Panel de gestión

**Fila de canchas** (arriba, estado en vivo)
Tarjetas por cancha: libre en verde con botón de asignar; ocupada mostrando los 4 jugadores y el tiempo transcurrido.

**Bandeja de confirmación** (badge con contador)
Partidos en `RESULTADO_CARGADO` esperando al admin. Resultado, quién lo cargó, y botones confirmar / rechazar con motivo.

**Cola de espera**
Lista ordenada de parejas esperando cancha. Reordenable a mano, con botón de sacar de la cola.

**Parejas armadas**
Tarjeta por pareja con los dos jugadores y su lado, partidos jugados y ganados, botón de desarmar (deshabilitado si están jugando).

**Disponibles**, en tres columnas:

| Revés | Drive | Ambos |
|---|---|---|

"Ambos" es el comodín para cerrar cualquier combinación. Aviso blando si se juntan dos del mismo lado (avisa pero deja pasar). Contador de sueltos.

**Ranking en vivo** y **historial de partidos** (filtrable por jugador, con resultado por sets).

## 8. Puntas sueltas para más adelante

- **Confirmación del rival**: hoy carga uno de los 4 y confirma el admin. Si el volumen crece, sumar confirmación del rival antes de que llegue al admin descarga bastante trabajo del admin.
- **Cola sin rival definido**: si una pareja se anota a esperar sin rival, definir si el sistema la cruza automáticamente con la siguiente de la cola o si espera a que alguien la elija.
- **Timeout de cancha**: un partido que quedó `EN_CURSO` tres horas porque nadie cargó el resultado bloquea la cancha. Vale un aviso en el panel a partir de cierto tiempo.
