# Endpoints que usa el Back Office

Listado de las llamadas que el Back Office hace hoy a la API de DeportiX. El navegador no habla con la API directo: cada ruta de abajo sale por el proxy `/api/proxy/{ruta}`.

Las rutas están agrupadas como la navegación del producto: primero **Datos maestros** u **Operación deportiva**, y dentro de cada bloque el deporte.

## Convenciones

- **GET** sin cuerpo. Los filtros van en query string.
- **POST / PATCH / PUT / DELETE** envían JSON, salvo la subida de imágenes.
- En tenis, los listados de jugadores, ediciones, rondas y participantes agregan `published=all` para ver borradores y publicados. Los partidos no usan ese filtro.
- `POST /v1/uploads` sube un archivo (`multipart`: `file`, `purpose`, `entityId` opcional) y devuelve la URL. Lo usan los logos de organización y equipo de fútbol, el logo al crear una competición de fútbol, y el logo de una competición de Fórmula 1.

---

## Datos maestros

### Fútbol

Catálogo de países, organizaciones, ligas y equipos. Pantallas: Estructura, Organizaciones y Equipos.

#### `GET /countries`

Lista los países.

#### `POST /countries`

Crea un país.

Recibe `{ name, code, flag }`.

#### `PATCH /countries?name={nombre}`

Actualiza un país. El identificador es el nombre.

Recibe `{ name, code, flag }`.

#### `DELETE /countries?name={nombre}`

Elimina un país.

#### `GET /organizations`

Lista organizaciones. Query opcional: `country`.

#### `GET /organizations?id={id}`

No hay un GET por id. El detalle se resuelve sobre el listado.

#### `POST /organizations`

Crea una organización.

Recibe `{ name, abbreviation, logo, logo_alt, country: { name, code, flag } }`.

#### `PATCH /organizations?id={id}`

Actualiza nombre, abreviatura y logos.

Recibe `{ name, abbreviation, logo, logo_alt }`.

#### `DELETE /organizations?id={id}`

Elimina una organización.

#### `GET /leagues`

Lista las ligas (estructura del deporte).

#### `GET /leagues?id={id}`

Lee una liga, con sus temporadas embebidas.

#### `POST /leagues`

Crea una liga.

Recibe `{ league: { name, type, logo }, country: { name, code, flag }, organization?: { id }, seasons: [] }`.

#### `PATCH /leagues?id={id}`

Actualiza nombre, tipo, logo, país y organización. Reenvía las temporadas que ya tenía la liga.

#### `GET /teams?league={leagueId}`

Lista los equipos de una liga. En maestros se llama por cada liga del alcance (país / organización / liga).

Query opcional: `season`.

#### `GET /v1/teams/{id}`

Lee un equipo por id de Firestore o id externo.

#### `POST /teams?league={leagueId}`

Crea un equipo en esa liga.

Recibe `{ name, code, country, logo }`.

#### `PATCH /teams?id={id}`

Actualiza nombre, código, país o logo. Solo manda los campos que cambiaron.

#### `DELETE /teams?id={id}`

Elimina un equipo.

### Football americano

Catálogo de países, ligas y equipos. Pantallas: Estructura y Equipos.

#### `GET /american-football/countries`

Lista los países.

#### `POST /american-football/countries`

Crea un país.

Recibe `{ name, code, flag }`.

#### `PATCH /american-football/countries?name={nombre}`

Actualiza un país. El identificador es el nombre.

Recibe `{ name, code, flag }`.

#### `GET /american-football/leagues`

Lista las ligas.

#### `GET /american-football/leagues?id={id}`

Lee una liga.

#### `POST /american-football/leagues`

Crea una liga.

Recibe `{ league: { name, type, logo, altLogo }, country: { name, code, flag }, seasons: [] }`.

#### `PATCH /american-football/leagues?id={id}`

Actualiza nombre, tipo, logos y país. Reenvía las temporadas existentes.

#### `GET /american-football/teams?league={leagueId}&season={year}`

Lista equipos de una liga en la temporada vigente (o la primera disponible). El catálogo de equipos recorre las ligas y junta el resultado.

#### `POST /american-football/teams?league={leagueId}`

Crea un equipo.

Recibe `{ name, logo }`. Ciudad, conferencia y división se guardan solo en la pantalla; no salen en este cuerpo.

#### `PATCH /american-football/teams?id={id}`

Actualiza nombre y/o logo.

#### `DELETE /american-football/teams?id={id}`

Elimina un equipo.

### Fórmula 1

Catálogo de circuitos, equipos y pilotos.

#### `GET /formula-1/circuits`

Lista los circuitos.

#### `POST /formula-1/circuits`

Crea un circuito.

Recibe `{ name, country, image }`.

#### `PATCH /formula-1/circuits?id={id}`

Actualiza nombre, país o imagen.

#### `DELETE /formula-1/circuits?id={id}`

Elimina un circuito.

#### `GET /formula-1/teams`

Lista los equipos.

#### `POST /formula-1/teams`

Crea un equipo.

Recibe `{ name, logo }`.

#### `PATCH /formula-1/teams?id={id}`

Actualiza nombre y/o logo.

#### `DELETE /formula-1/teams?id={id}`

Elimina un equipo.

#### `GET /formula-1/drivers`

Lista los pilotos. Query opcional: `team`.

#### `POST /formula-1/drivers`

Crea un piloto.

Recibe `{ name, number, teamId }`. Nacionalidad y foto se muestran en pantalla; este alta no las envía.

#### `PATCH /formula-1/drivers?id={id}`

Actualiza nombre, número y/o equipo.

#### `DELETE /formula-1/drivers?id={id}`

Elimina un piloto.

### Tenis

Catálogo de torneos (ediciones) y jugadores.

El país del formulario de torneo/jugador se elige por nombre desde `GET /countries` (catálogo compartido); al guardar se envía el `countryCode` del país seleccionado.

#### `GET /countries`

Lista países para el selector de sede / nacionalidad (mismo catálogo que fútbol).

#### `GET /tennis/tournaments?published=all`

Lista torneos/ediciones para el catálogo de maestros.

#### `POST /tennis/tournaments`

Crea un torneo desde Datos maestros.

Recibe `{ name, shortName, category, gender, eventType: "singles", countryCode, city, imageUrl, altImageUrl, startDate, endDate, year, drawSize, status }`. `category` es `grand_slam`, `atp_1000` o `wta_1000`. `gender` es `male` o `female`. Fechas en `YYYY-MM-DD`. `drawSize` es la cantidad esperada de participantes del main draw (p. ej. 32, 64, 128). Imagen e imagen alternativa se pueden cargar con URL o con `POST /v1/uploads`.

Por defecto la UI marca «Publicado». Si queda publicado, enseguida llama a `POST /tennis/tournaments/{id}/publish`; si es borrador, a `POST /tennis/tournaments/{id}/unpublish`.

#### `PATCH /tennis/tournaments/{id}`

Actualiza los mismos campos del alta (solo los que cambiaron), incluidos `altImageUrl` y `drawSize`. Si el estado de publicación cambia a publicado llama a `POST /tennis/tournaments/{id}/publish`; si pasa a borrador, a `POST /tennis/tournaments/{id}/unpublish`.

#### `GET /tennis/players?published=all`

Lista jugadores, publicados y borrador. Query opcional: `gender` (`male` | `female`). El estado activo/inactivo se filtra en el cliente.

#### `POST /tennis/players`

Crea un jugador.

Recibe `{ fullName, displayName, photoUrl, countryCode, gender, published }`. `published` es `false` solo si el jugador se marca inactivo.

#### `PATCH /tennis/players/{id}`

Actualiza los campos que cambiaron (`fullName`, `displayName`, `photoUrl`, `countryCode`, `gender`, `published`).

#### `DELETE /tennis/players/{id}`

Elimina un jugador.

---

## Operación deportiva

### Fútbol

Recorrido organización → liga → temporada, y dentro de la temporada: general, participantes, estructura (jornadas), partidos y clasificación.

#### `GET /organizations`

Lista organizaciones para armar la navegación, incluido el grupo de ligas sin organización.

#### `GET /leagues`

Lista ligas para esa navegación y para el detalle de una organización.

#### `GET /leagues?organization={orgId}`

Lista las ligas de una organización.

#### `GET /leagues?id={id}`

Lee la liga y, con ella, sus temporadas (año, inicio, fin, si es la vigente).

#### `POST /leagues`

Crea una competición desde operación. Mismo cuerpo que en maestros.

#### `GET /leagues/seasons`

Lista los años de temporada disponibles en el catálogo, sin filtrar por liga.

#### `GET /leagues/seasons?league={leagueId}`

Lista los años de una liga cuando la liga no trae temporadas embebidas.

#### `POST /leagues/seasons?league={leagueId}`

Agrega un año de temporada.

Recibe `{ year }`.

#### `PATCH /leagues/seasons?league={leagueId}`

Actualiza vigencia y fechas de ese año.

Recibe `{ year, current, start, end }`. `current` es verdadero cuando el estado de la temporada es vigente.

#### `GET /v1/leagues/{leagueId}/seasons/{year}/participants`

Lista los equipos inscritos en la temporada.

Si viene vacío o falla, la pantalla usa `GET /teams?league={leagueId}&season={year}` como respaldo.

#### `PUT /v1/leagues/{leagueId}/seasons/{year}/participants`

Reemplaza la plantilla de la temporada.

Recibe `{ team_ids: string[] }`.

#### `GET /fixtures/rounds?league={leagueId}&season={year}`

Lista los nombres de jornada.

#### `POST /fixtures/rounds?league={leagueId}&season={year}`

Crea una jornada que todavía no existe. No borra ni renombra las que ya están.

Recibe `{ name, position }`.

#### `GET /fixtures?league={leagueId}&season={year}`

Lista los partidos de la temporada.

#### `POST /fixtures`

Crea un partido.

Recibe:

```json
{
  "fixture": { "date": "ISO-8601", "status": { "short": "NS|LIVE|FT|...", "long": "estado de pantalla" } },
  "league": { "id": "liga", "season": 2026, "round": "nombre de jornada" },
  "teams": { "home": { "id": "..." }, "away": { "id": "..." } },
  "goals": { "home": 0, "away": 0 }
}
```

#### `PATCH /fixtures/{id}`

Actualiza un partido. Mismo cuerpo que el alta.

#### `GET /standings?league={leagueId}&season={year}`

Lista la clasificación.

#### `POST /standings`

Guarda una fila de clasificación. Se llama una vez por equipo. No hay reemplazo masivo ni borrado.

Recibe `{ league: { id, season }, team: { id }, rank, points, goalsDiff, all: { played, win, draw, lose, goals: { for, against } } }`.

### Football americano

Liga → temporada → general, participantes, estructura, partidos y clasificación.

Participantes y jornadas no llaman a la API: los participantes se arman con los equipos de la liga y las jornadas son las semanas 1–18 en el cliente. Guardar esas dos pantallas no persiste cambios.

#### `GET /american-football/leagues`

Lista ligas.

#### `GET /american-football/leagues?id={id}`

Lee la liga (también para armar el cuerpo de partidos y clasificación).

#### `POST /american-football/leagues`

Crea una competición. Mismo cuerpo que en maestros.

#### `GET /american-football/seasons?league={leagueId}`

Lista años cuando la liga no trae temporadas embebidas. Si las trae, se leen del `GET` de la liga.

#### `POST /american-football/seasons?league={leagueId}`

Agrega un año.

Recibe `{ year }`. Si hay fechas o estado, enseguida hace el `PATCH`.

#### `PATCH /american-football/seasons?league={leagueId}`

Actualiza vigencia y fechas.

Recibe `{ year, current, start, end }`.

#### `GET /american-football/teams?league={leagueId}&season={year}`

Lista equipos para participantes, partidos y clasificación.

#### `GET /american-football/games?league={leagueId}&season={year}`

Lista los partidos.

#### `POST /american-football/games`

Crea un partido.

Recibe `game` (semana, fecha, hora, zona, estado), `league` (id, nombre, temporada, logo), `teams.home` y `teams.away` (id, nombre, logo) y `scores.home.total` / `scores.away.total`.

#### `PATCH /american-football/games/{id}`

Actualiza un partido. Mismo cuerpo que el alta.

#### `GET /american-football/standings?league={leagueId}&season={year}`

Lista la clasificación.

#### `POST /american-football/standings`

Guarda una fila. Una llamada por equipo.

Recibe `{ league: { id, name, season, logo }, team: { id, name, logo }, position, won, lost, ties }`.

### Fórmula 1

Año → país → competición → temporada. Dentro de la temporada: participantes, calendario, resultados de la carrera y clasificaciones. También hay clasificación de pilotos y de equipos del año.

El país del formulario de competición sale de `GET /countries` (catálogo de fútbol).

#### `GET /formula-1/seasons`

Lista los años disponibles.

#### `GET /formula-1/competitions`

Lista competiciones. Query: `season`, `country` y un `_cb` con la hora actual para no usar una copia cacheada.

#### `GET /formula-1/competitions?id={id}`

Lee una competición (formulario y detalle).

#### `POST /formula-1/competitions`

Crea una competición.

Recibe el documento completo: `name`, `slug`, `shortName`, `officialName`, `championshipType`, `status`, `startDate`, `endDate`, `classifications`, `sprint`, `pointsSystemId`, `branding.logoUrl`, `website`, `active`, `seasonId`, `location`.

#### `PATCH /formula-1/competitions?id={id}`

Actualiza ese mismo documento, o solo `{ status }` cuando se cambia el estado desde el listado. También lo usa la pestaña General de la temporada (Operación) para persistir `startDate`, `endDate` y `status` — no hay recurso de escritura de temporadas F1 aparte.

#### `DELETE /formula-1/competitions?id={id}`

Elimina una competición.

#### `GET /formula-1/races?season={year}`

Lista las carreras del año (todas las competiciones).

#### `GET /formula-1/races?season={year}&competition={id}`

Lista las carreras de una competición en ese año. También se usa para saber en qué años tiene actividad una competición.

#### `GET /formula-1/races/{id}`

Lee una carrera, incluidos los destacados si ya vienen embebidos.

#### `POST /formula-1/races`

Crea una carrera. Con eso queda registrada la temporada: no hay alta aparte de temporadas.

Recibe `{ competitionId, circuitId, season, type, date, status }`.

#### `PATCH /formula-1/races/{id}`

Actualiza circuito, fecha, tipo o estado (`circuitId`, `date`, `type`, `status`).

El mismo `PATCH` guarda los destacados de la carrera en `highlights`: `p1DriverId`, `p2DriverId`, `p3DriverId`, `poleDriverId`, `fastestDriverId`, `winningTeamId`, `updatedAt`.

#### `DELETE /formula-1/races/{id}`

Elimina una carrera.

#### `GET /formula-1/circuits`

Lista circuitos para elegir sede al armar el calendario.

#### `GET /formula-1/drivers`

Lista pilotos para participantes, resultados y clasificaciones.

#### `GET /formula-1/teams`

Lista equipos para participantes y clasificaciones.

#### `GET /formula-1/entries?competition={id}&season={year}`

Lista los participantes de la temporada (piloto + equipo).

#### `POST /formula-1/entries`

Inscribe un piloto.

Recibe `{ competitionId, season, driverId, teamId, number, role }`. `role` es `race-driver` o `reserve-driver`.

#### `PATCH /formula-1/entries?id={id}`

Actualiza piloto, equipo, número, rol o si sigue activo.

#### `DELETE /formula-1/entries?id={id}`

Quita un participante. Al guardar la plantilla completa, el cliente borra los que ya no están, actualiza el equipo si cambió y crea los nuevos.

#### `GET /formula-1/rankings/drivers?season={year}`

Clasificación de pilotos del campeonato de ese año.

#### `POST /formula-1/rankings/drivers`

Crea una fila de esa clasificación.

Recibe `{ driverId, season, position, points, wins, podiums }`. Si es de una competición, también `competitionId`.

#### `PATCH /formula-1/rankings/drivers?id={id}`

Actualiza una fila existente. Mismo cuerpo.

#### `GET /formula-1/rankings/drivers?season={year}&competition={id}`

Clasificación de pilotos de una competición.

#### `GET /formula-1/rankings/teams?season={year}`

Clasificación de equipos del año.

#### `POST /formula-1/rankings/teams`

Crea una fila.

Recibe `{ teamId, season, position, points, wins, podiums }` y, si aplica, `competitionId`.

#### `PATCH /formula-1/rankings/teams?id={id}`

Actualiza una fila existente.

#### `GET /formula-1/rankings/teams?season={year}&competition={id}`

Clasificación de equipos de una competición.

#### `GET /formula-1/rankings/races?race={raceId}`

Resultados de una carrera (posición por piloto).

#### `POST /formula-1/rankings/races`

Guarda una posición. Al guardar destacados se manda el podio (P1–P3).

Recibe `{ raceId, driverId, position }`.

#### `GET /formula-1/rankings/startinggrid?race={raceId}`

Parrilla de salida. Se lee al armar destacados si la carrera todavía no los trae.

#### `POST /formula-1/rankings/startinggrid`

Marca la pole.

Recibe `{ raceId, driverId, position: 1 }`.

#### `GET /formula-1/rankings/fastestlaps?race={raceId}`

Vueltas rápidas. Misma lectura de respaldo que la parrilla.

#### `POST /formula-1/rankings/fastestlaps`

Marca la vuelta rápida.

Recibe `{ raceId, driverId, position: 1, lap: 1 }`.

### Tenis

Edición (torneo) → participantes y partidos. Publicar es el estado de la edición, no de cada partido.

#### `GET /tennis/tournaments?published=all`

Lista las ediciones.

#### `GET /tennis/tournaments/{id}?published=all`

Lee una edición.

#### `POST /tennis/tournaments`

Crea una edición.

Mismo cuerpo que el alta desde Datos maestros · Torneos (`name`, `shortName`, `category`, `gender`, `eventType`, `countryCode`, `city`, `imageUrl`, `altImageUrl`, `startDate`, `endDate`, `year`, `drawSize`, `status`). Desde la lista rápida de operación pueden omitirse sede e imágenes; si no hay categoría se infiere del circuito (`atp_1000` / `wta_1000`).

Por defecto la UI marca «Publicado». Si queda publicado, enseguida llama a `POST /tennis/tournaments/{id}/publish`; si es borrador, a `POST /tennis/tournaments/{id}/unpublish`. En la lista de operación se puede cambiar Publicado ↔ Borrador sin entrar a la edición.

#### `PATCH /tennis/tournaments/{id}`

Actualiza los campos del torneo que cambiaron (nombre, categoría, sede, fechas, `drawSize`, estado, etc.). No envía un flag de partido.

Si el estado de publicación pasa a publicado llama a `POST /tennis/tournaments/{id}/publish`; si pasa a borrador, a `POST /tennis/tournaments/{id}/unpublish`.

#### `POST /tennis/tournaments/{id}/publish`

Marca la edición como publicada para que la consuma App QD. También publica rondas y participantes que ya existan. No recibe cuerpo. Después de guardar partidos de una edición ya publicada se vuelve a llamar, para que las rondas nuevas queden publicadas.

#### `POST /tennis/tournaments/{id}/unpublish`

Marca la edición como borrador: deja de listarse en App QD. También despublica rondas y participantes que ya existan. No recibe cuerpo.

#### `GET /tennis/players?published=all`

Lista jugadores para armar el cuadro. Query opcional: `gender`, según sea ATP o WTA.

#### `GET /tennis/tournaments/{id}/entries?published=all`

Lista los participantes de la edición.

#### `POST /tennis/tournaments/{id}/entries`

Inscribe un jugador.

Recibe `{ playerId, seed, entryType: "direct" }`.

#### `PATCH /tennis/entries/{id}`

Actualiza la cabeza de serie.

Recibe `{ seed }`.

#### `DELETE /tennis/entries/{id}`

Quita un participante que ya no está en la lista guardada.

#### `GET /tennis/tournaments/{id}/rounds?published=all`

Lista las rondas del cuadro. Se consulta al guardar partidos.

#### `POST /tennis/tournaments/{id}/rounds`

Crea una ronda que el cuadro todavía no tiene.

Recibe `{ roundNumber, name, status: "pending" }`.

#### `GET /tennis/tournaments/{id}/matches`

Lista los partidos de la edición.

#### `POST /tennis/tournaments/{id}/matches`

Crea un partido del cuadro.

Recibe `{ roundId, bracketPosition, competitor1Id, competitor2Id, scheduledAt, timezone, status, winnerToMatchId, winnerToPosition }`. Si hay fecha, `timezone` va en `utc`. Si falta un jugador, `status` es `pending_competitors`.

#### `PATCH /tennis/matches/{id}`

Actualiza un partido. Mismo cuerpo que el alta.

Al guardar partidos con ganador, el BO enlaza el cuadro y rellena la ronda siguiente con `PATCH` de `{ competitor1Id }` o `{ competitor2Id }` en el partido destino (además del avance que hace `POST /result`). No hay un endpoint dedicado de propagación.

#### `DELETE /tennis/matches/{id}`

Elimina un partido quitado del cuadro.

#### `POST /tennis/matches/{id}/result`

Registra el resultado cuando el partido queda finalizado, retirado, walkover o descalificado. La API avanza al ganador al partido enlazado (`winnerToMatchId` / `winnerToPosition`) si el cuadro ya está cableado.

Recibe `{ winnerId, loserId, resultType, setsPlayer1, setsPlayer2, setScores }`. `resultType` es `normal`, `retirement`, `walkover` o `disqualification`. Para `normal`, `setsPlayer1` y `setsPlayer2` son obligatorios (el BO los deriva del marcador o usa 2–0 si solo hay ganador). `setScores` es opcional: lista `{ set, competitor1, competitor2 }`.
