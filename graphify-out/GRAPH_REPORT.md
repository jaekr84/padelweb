# Graph Report - /Users/jae/Documents/padelweb  (2026-08-03)

## Corpus Check
- Large corpus: 443 files · ~641,138 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1762 nodes · 4400 edges · 140 communities (92 shown, 48 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.71)
- Token cost: 63,126 input · 0 output

## Community Hubs (Navigation)
- Gestión de Usuarios Admin
- Scripts de Migración DB
- Seeds y Perfiles de Jugador
- Landing y Feed Social
- Cancha Abierta Admin
- Desafío: Canchas y Panel
- Mensajería y Cancha Abierta Pública
- Esquema Drizzle Principal
- Desafío: Categorías y Simulación
- Marketplace y Ranking
- Dependencias de Desarrollo
- Desafío: Estados y Puntaje
- Simulador de Matchmaking
- Documentación del Proyecto
- Perfiles, Uploads y Push
- Test de Matchmaking
- Desafío: CRUD y Gestión
- Configuración TypeScript
- Desafío: Cola de Espera
- Autenticación y Onboarding
- Partidos Públicos
- Desafío: Partidos y Resultados
- Desafío: Vista Pública
- Reset de Base de Datos
- Invitaciones de Club
- Tipos de Fixture Compartidos
- Colas y Dashboard de Torneo
- Categorías y Promociones
- Tarjetas de Partido
- Puntos y Ajustes de Torneo
- Fixture: Grupos y Bracket
- Espejo de Bracket Americano
- Estadísticas de Torneo
- Encabezados y Finalización
- Bracket y Clasificados
- Setup de Fixture y Presentismo
- Sponsors
- Presentismo Americano
- Páginas de Torneo e Inscripción
- Solicitudes de Registro
- Codemod de Tema
- Matchmaking: Cancha Abierta
- Sidebar y Roles
- Matchmaking: Siembra
- Layout Raíz y Fuentes
- Crear Torneo y Select UI
- Grilla de Canchas Americano
- Migración Inicial DB
- Providers y Datos Maestros
- Admin de Torneos
- Matchmaking: Americano y Round Robin
- Preview de Bracket
- Guardado de Fixture
- Dependencias UI Base
- Manifest PWA
- Dashboard de Torneo en Vivo
- Pantallas de Carga
- Dashboard de Estadísticas
- Matchmaking: Grupos
- Setup de Fixture Legacy
- Matchmaking: Tabla de Posiciones
- Listados de Torneos
- Migración Cancha Abierta
- Acciones de Dashboard de Torneo
- Migración Mensajería y Sponsors
- Proxy de Autenticación
- Script Tablas Desafío
- Chequeo de Base de Datos
- Chequeo de Torneos
- Reglamento
- Historial de Partidos Americano
- Chequeo DB en Fixture
- Página de Inscripción
- Borrado de Usuario
- Creación de Superadmin
- Script fix.js
- Fix de Contraste v1
- Fix de Contraste v2
- Fix de Contraste v3
- Columna de Ubicación
- Columna de Horario
- Chequeo de Estructura DB
- Tabla de Ajustes
- Arreglo de Base de Datos
- Test de Conexión DB
- Styleguide de Diseño
- Tarjeta de Post Social
- Migración Partidos Públicos
- bcryptjs
- canvas-confetti
- clsx
- date-fns
- drizzle-orm
- Config de ESLint
- faker
- framer-motion
- hookform resolvers
- jose
- Neon Serverless
- next
- Config de Next.js
- next-themes
- pg
- Radix Dropdown Menu
- Radix Select
- Radix Tabs
- react-dom
- react-hook-form
- sonner
- tailwind-merge
- TanStack React Query
- Tipos de web-push
- web-push
- zod
- zustand
- Migración de Comentarios
- Tipos Globales JWT
- Actualización de Temas

## God Nodes (most connected - your core abstractions)
1. `getSession` - 176 edges
2. `db` - 119 edges
3. `users` - 81 edges
4. `tournaments` - 38 edges
5. `ejecutar()` - 36 edges
6. `requerirAdmin()` - 34 edges
7. `revalidarDesafio()` - 34 edges
8. `Player` - 33 edges
9. `clubs` - 31 edges
10. `BracketMatch` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Panel de Gestión del Desafío` --semantically_similar_to--> `Layout y Grid de Alta Densidad`  [INFERRED] [semantically similar]
  docs/desafio-specs.md → HIGH_DENSITY_UI.md
- `Estándar de Diseño Alta Densidad (Dense-First)` --conceptually_related_to--> `next/font with Geist Font Family`  [INFERRED]
  HIGH_DENSITY_UI.md → README.md
- `Módulo Desafío` --conceptually_related_to--> `padelweb Next.js Application`  [INFERRED]
  docs/desafio-specs.md → README.md
- `Panel de Gestión del Desafío` --conceptually_related_to--> `Estándar de Diseño Alta Densidad (Dense-First)`  [INFERRED]
  docs/desafio-specs.md → HIGH_DENSITY_UI.md
- `AmericanoMatchCard()` --references--> `react`  [EXTRACTED]
  src/app/(main)/tournaments/fixture/components/americano/AmericanoMatchCard.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ciclo de vida del partido (inicio → carga → confirmación → puntos)** — docs_desafio_specs_iniciar_partido, docs_desafio_specs_cargar_resultado, docs_desafio_specs_confirmar_resultado, docs_desafio_specs_estadopartido, docs_desafio_specs_estadoinscripcion, docs_desafio_specs_desafiocancha [EXTRACTED 1.00]
- **Ledger de puntos individual e idempotente** — docs_desafio_specs_ledger_individual, docs_desafio_specs_desafiopuntaje, docs_desafio_specs_confirmar_resultado, docs_desafio_specs_inscribir_jugador, docs_desafio_specs_ranking_query [EXTRACTED 1.00]
- **Secciones del estándar de alta densidad** — high_density_ui_typography_hierarchy, high_density_ui_containers_spacing, high_density_ui_action_buttons, high_density_ui_layout_grid [EXTRACTED 1.00]

## Communities (140 total, 48 thin omitted)

### Community 0 - "Gestión de Usuarios Admin"
Cohesion: 0.05
Nodes (57): clubMassInscribe(), getMyClubMembers(), banUser(), checkSuperAdmin(), getUsers(), resetDatabasePlayers(), resetUserPassword(), toggleUserStatus() (+49 more)

### Community 1 - "Scripts de Migración DB"
Cohesion: 0.05
Nodes (17): addColumn(), main(), AdminLiveManagementPage(), initializeOpenCourtTables(), AdminOpenCourtPage(), dynamic, EventJoinPage(), CanchaAbiertaPublicPage() (+9 more)

### Community 2 - "Seeds y Perfiles de Jugador"
Cohesion: 0.07
Nodes (36): ClubMassInscribeInput, getPlayerProfileData(), MatchHistoryItem, DashboardPage(), dynamic, dynamic, HomePage(), ProfilePage() (+28 more)

### Community 3 - "Landing y Feed Social"
Cohesion: 0.06
Nodes (42): submitContactForm(), fadeIn, fadeUp, LandingPage(), logoEntrance, staggerContainer, ContactoPage(), addComment() (+34 more)

### Community 4 - "Cancha Abierta Admin"
Cohesion: 0.07
Nodes (46): addCourtToEventAction(), bulkMarkAllAsPaidAction(), bulkMarkAllAsPresentAction(), createOpenCourtEventAction(), createOpenCourtMatchAction(), deleteOpenCourtEventAction(), finishOpenCourtEventAction(), finishOpenCourtMatchAction() (+38 more)

### Community 5 - "Desafío: Canchas y Panel"
Cohesion: 0.09
Nodes (45): agregarCancha(), agregarCanchas(), cambiarEstadoCancha(), CanchaResumen, eliminarCancha(), existeDesafio(), renombrarCancha(), traerCancha() (+37 more)

### Community 6 - "Mensajería y Cancha Abierta Pública"
Cohesion: 0.06
Nodes (40): getClubs(), getPlayersByClub(), getOpenCourtMatchesAction(), getOpenCourtRegistrationsAction(), EventListing, OpenCourtPublicClient(), OpenCourtPublicClientProps, PublicOpenCourtCard() (+32 more)

### Community 7 - "Esquema Drizzle Principal"
Cohesion: 0.04
Nodes (42): Challenge, ChallengeCourt, challengeCourtsRelations, ChallengeMatch, challengeMatchesRelations, ChallengePair, challengePairsRelations, ChallengePoint (+34 more)

### Community 8 - "Desafío: Categorías y Simulación"
Cohesion: 0.10
Nodes (43): sembrar(), Caso, cat(), CATS, check(), construirGrupos(), DevDesafioPage(), Estado (+35 more)

### Community 9 - "Marketplace y Ranking"
Cohesion: 0.07
Nodes (34): checkSuperAdmin(), promotePlayerManually(), CandidatePlayer, PromotionManager(), PromotionManagerProps, createMarketplaceItem(), deleteMarketplaceItem(), getMarketplaceItems() (+26 more)

### Community 10 - "Dependencias de Desarrollo"
Cohesion: 0.05
Nodes (41): autoprefixer, babel-plugin-react-compiler, dotenv, drizzle-kit, eslint, eslint-config-next, devDependencies, autoprefixer (+33 more)

### Community 11 - "Desafío: Estados y Puntaje"
Cohesion: 0.07
Nodes (30): ESTADO_CANCHA, ESTADO_COLA, EstadoCancha, EstadoCola, EstadoDesafio, EstadoInscripcion, EstadoPartido, ETIQUETA_ESTADO_DESAFIO (+22 more)

### Community 12 - "Simulador de Matchmaking"
Cohesion: 0.08
Nodes (28): autoScores(), buildRoster(), buildRoundRobin(), CLUBS, Diag, diagnose(), EventType, Gender (+20 more)

### Community 13 - "Documentación del Proyecto"
Cohesion: 0.09
Nodes (35): Transacción: Cargar Resultado (jugador), Categoria (modelo Prisma), Transacción: Cerrar Desafío, Transacción: Confirmar Resultado (admin), Desafio (modelo Prisma), Módulo Desafío, DesafioCancha (modelo Prisma), DesafioCola (modelo Prisma) (+27 more)

### Community 14 - "Perfiles, Uploads y Push"
Cohesion: 0.12
Nodes (25): DELETE(), POST(), POST(), logoutAction(), resetDatabaseAction(), CreateOpenCourtPage(), DirectoryPage(), updatePasswordAction() (+17 more)

### Community 15 - "Test de Matchmaking"
Cohesion: 0.09
Nodes (26): amPlayer(), Check, GP, grPlayer(), GUIDED_RESULTS, nid(), ocPlayer(), ok() (+18 more)

### Community 16 - "Desafío: CRUD y Gestión"
Cohesion: 0.13
Nodes (27): abrirDesafio(), cerrarDesafio(), contarInscriptos(), crearDesafio(), DatosDesafio, DesafioResumen, editarDesafio(), eliminarDesafio() (+19 more)

### Community 17 - "Configuración TypeScript"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 18 - "Desafío: Cola de Espera"
Cohesion: 0.14
Nodes (26): borrar(), EMAILS, JUGADORES, main(), anotarEnCola(), asignarSiguienteDeCola(), intentarAsignarCancha(), listarCola() (+18 more)

### Community 19 - "Autenticación y Onboarding"
Cohesion: 0.12
Nodes (17): Role, switchRole(), VALID_ROLES, loginAction(), LoginPage(), JWT_SECRET, linkRoleToUser(), OnboardingForm() (+9 more)

### Community 20 - "Partidos Públicos"
Cohesion: 0.13
Nodes (20): searchPlayers(), startConversation(), cancelPublicMatch(), completePublicMatch(), createPublicMatch(), joinPublicMatch(), leavePublicMatch(), MatchDetailClient() (+12 more)

### Community 21 - "Desafío: Partidos y Resultados"
Cohesion: 0.15
Nodes (24): filaACancha(), listarCanchas(), esAdmin(), requerirSesion(), darmeDeBaja(), inscribirme(), listarParejas(), armarResumenes() (+16 more)

### Community 22 - "Desafío: Vista Pública"
Cohesion: 0.13
Nodes (16): buscarMiPartido(), datosPublicos, MiPartido, TarjetaPublica, FilaRankingUI, nombreDe(), rankingDelDesafio(), DesafioPublicoClient() (+8 more)

### Community 23 - "Reset de Base de Datos"
Cohesion: 0.18
Nodes (21): checkSuperAdmin(), deletableUserCondition, getResetCounts(), PROTECTED_EMAILS, protectedUserCondition, resetScope(), wipeClubs(), wipeMatches() (+13 more)

### Community 24 - "Invitaciones de Club"
Cohesion: 0.19
Nodes (19): createInvitation(), generateClubInvitationLink(), generateInvitationLink(), getInvitationLink(), INVITATION_SECRET, InvitationStatus, issueInvitation(), listInvitations() (+11 more)

### Community 25 - "Tipos de Fixture Compartidos"
Cohesion: 0.25
Nodes (15): AmericanoManagerProps, AmericanoPlayoffsProps, AmericanoBracketProps, AmericanoModals(), AmericanoModalsProps, TournamentGroupsViewProps, TournamentLiveQueueProps, UseTournamentLogicProps (+7 more)

### Community 26 - "Colas y Dashboard de Torneo"
Cohesion: 0.11
Nodes (13): AmericanoPlayoffQueue(), AmericanoPlayoffQueueProps, MatchStatus, roundTitle(), teamName(), TournamentDashboard(), TournamentDashboardProps, TournamentGroupsView() (+5 more)

### Community 27 - "Categorías y Promociones"
Cohesion: 0.13
Nodes (13): addCategory(), deleteCategory(), updateCategory(), CategoriesManager(), Category, AdminCategoriesPage(), dynamic, CreateTournamentPage() (+5 more)

### Community 28 - "Tarjetas de Partido"
Cohesion: 0.12
Nodes (11): react, react, AmericanoMatchCard(), AmericanoMatchCardProps, MiniProfileCardProps, TournamentBracketViewProps, MiniProfileCardProps, TournamentMatchCard() (+3 more)

### Community 29 - "Puntos y Ajustes de Torneo"
Cohesion: 0.19
Nodes (13): PromotionsPage(), AdminPointsClient(), LayoutGrid(), AdminPointsPage(), dynamic, createTournament(), PointsConfig, TournamentInput (+5 more)

### Community 30 - "Fixture: Grupos y Bracket"
Cohesion: 0.13
Nodes (14): slotName(), BracketMatch, BracketSlot, buildGroups(), FixtureClientInner(), FixtureClientProps, Group, GroupStanding (+6 more)

### Community 31 - "Espejo de Bracket Americano"
Cohesion: 0.16
Nodes (14): AmericanoBracketMirror(), AmericanoBracketMirrorProps, ManageModal(), ManageModalProps, MirrorCell(), ROUND_ACCENTS, roundAccent(), roundTitle() (+6 more)

### Community 32 - "Estadísticas de Torneo"
Cohesion: 0.16
Nodes (15): bracketRoundName(), cleanPair(), dynamic, Props, revalidate, TournamentStatsPage(), asDate(), computeTournamentStats() (+7 more)

### Community 33 - "Encabezados y Finalización"
Cohesion: 0.17
Nodes (13): publishTournamentResults(), FinalizeTournamentButton(), Props, finalizeTournament(), AmericanoHeader(), AmericanoHeaderProps, TournamentHeader(), TournamentHeaderProps (+5 more)

### Community 34 - "Bracket y Clasificados"
Cohesion: 0.22
Nodes (15): rbBuildBracket(), updateTournamentMetadata(), useTournamentLogic(), advanceBracket(), BrMatch, BrPlayer, BrSlot, isDoubleBye() (+7 more)

### Community 35 - "Setup de Fixture y Presentismo"
Cohesion: 0.19
Nodes (14): getAvailablePlayers(), quickInscribePlayer(), registerManualPlayer(), AmericanoSetupProps, Group, Match, Player, SplitAttendanceList() (+6 more)

### Community 36 - "Sponsors"
Cohesion: 0.26
Nodes (12): addSponsor(), deleteFileByUrl(), deleteSponsor(), getSponsors(), updateSponsor(), getSidebarUser(), AdminSponsorsPage(), Props (+4 more)

### Community 37 - "Presentismo Americano"
Cohesion: 0.40
Nodes (13): AmericanoManager(), getSeedingOrder(), AmericanoAttendance(), AmericanoStandingsTable(), checkKeysFor(), isMemberChecked(), isPairPlayer(), isTeamChecked() (+5 more)

### Community 38 - "Páginas de Torneo e Inscripción"
Cohesion: 0.14
Nodes (13): TournamentManager(), dynamic, Props, revalidate, TournamentManagePage(), dynamic, Props, TournamentDisplayPage() (+5 more)

### Community 39 - "Solicitudes de Registro"
Cohesion: 0.37
Nodes (13): approveSignupAction(), deleteMessageAction(), deleteRequestAction(), getContactMessages(), getPendingRequestsCount(), getPendingSignups(), getRegistrationRequests(), rejectSignupAction() (+5 more)

### Community 40 - "Codemod de Tema"
Cohesion: 0.22
Nodes (14): accentPrefixes(), ALWAYS_DARK, argv, dry, explicit, mapStringLiterals(), ON_SURFACE_TEXT_RULES, readQuoted() (+6 more)

### Community 41 - "Matchmaking: Cancha Abierta"
Cohesion: 0.27
Nodes (13): runOpenCourt(), buildOcHistories(), OcCompletedMatch, ocGender(), ocId(), OcMode, OcPickResult, OcPlayer (+5 more)

### Community 42 - "Sidebar y Roles"
Cohesion: 0.21
Nodes (9): switchActiveRole(), getProfileUrl(), NAV, NavItem, ROLE_LABELS, Sidebar(), SidebarProfileConsole(), SidebarProfileConsoleProps (+1 more)

### Community 43 - "Matchmaking: Siembra"
Cohesion: 0.29
Nodes (12): runSeeding(), bracketSizeFor(), buildSeedMap(), compareProfiles(), compareScores(), computeFirstRoundPairs(), DrawScore, FirstRoundPair (+4 more)

### Community 44 - "Layout Raíz y Fuentes"
Cohesion: 0.21
Nodes (10): chakraPetch, geistMono, geistSans, metadata, RootLayout(), russoOne, viewport, Home() (+2 more)

### Community 45 - "Crear Torneo y Select UI"
Cohesion: 0.22
Nodes (11): updateTournament(), compressImage(), CreateTournamentForm(), InitialData, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton (+3 more)

### Community 46 - "Grilla de Canchas Americano"
Cohesion: 0.19
Nodes (8): AmericanoAttendanceProps, AmericanoCourtGridProps, FlippableProfileCardProps, MiniProfileCardProps, SwapCandidate, AmericanoStandingsTableProps, TournamentAttendanceProps, Player

### Community 47 - "Migración Inicial DB"
Cohesion: 0.17
Nodes (11): `bracket_matches`, `categories`, `clubs`, `group_matches`, `marketplace_items`, `posts`, `registration_requests`, `registrations` (+3 more)

### Community 48 - "Providers y Datos Maestros"
Cohesion: 0.25
Nodes (6): getAllPlayers(), AmericanoPlayoffs(), MasterDataContext, MasterDataProvider(), Providers(), usePlayers()

### Community 49 - "Admin de Torneos"
Cohesion: 0.24
Nodes (9): Club, formatDate(), Props, Tournament, TournamentRow(), TournamentWithClub, DeleteTournamentButton(), Props (+1 more)

### Community 50 - "Matchmaking: Americano y Round Robin"
Cohesion: 0.18
Nodes (8): AmericanoSetup(), AmOptions, AmPlayer, AmScheduledMatch, generateAmericanoMatches(), RrGroup, RrMatch, RrPlayer

### Community 51 - "Preview de Bracket"
Cohesion: 0.33
Nodes (9): build16(), build8(), p(), Page(), team(), useBracket(), AmericanoCourtGrid(), TournamentAttendance() (+1 more)

### Community 52 - "Guardado de Fixture"
Cohesion: 0.29
Nodes (9): awardTournamentPoints(), BracketSlot, ensureParsed(), isUUID(), ManualPlayerData, PlayerLike, resetTournamentStatus(), SaveFixtureInput (+1 more)

### Community 53 - "Dependencias UI Base"
Cohesion: 0.22
Nodes (9): browser-image-compression, lucide-react, mysql2, dependencies, browser-image-compression, lucide-react, mysql2, @radix-ui/react-dialog (+1 more)

### Community 54 - "Manifest PWA"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 55 - "Dashboard de Torneo en Vivo"
Cohesion: 0.31
Nodes (8): extractYouTubeId(), initTeam(), LogEntry, MATCHES, nowTime(), POINT_SEQ, TeamState, TournamentDashboard()

### Community 57 - "Dashboard de Estadísticas"
Cohesion: 0.29
Nodes (4): CATEGORY_COLORS, CATEGORY_ORDER, DashboardClient(), DashboardStats

### Community 58 - "Matchmaking: Grupos"
Cohesion: 0.32
Nodes (7): buildGroups(), FixtureSetup(), buildEmptyGroups(), distributeIntoGroups(), GrGroup, GrPlayer, shuffle()

### Community 59 - "Setup de Fixture Legacy"
Cohesion: 0.32
Nodes (5): CATEGORIES, nextPow2(), REGISTERED, SetupFixturePage(), shuffleArray()

### Community 60 - "Matchmaking: Tabla de Posiciones"
Cohesion: 0.29
Nodes (6): GUIDED_GROUPS, GuidedExample(), computeGroupStandings(), Standing, StMatch, StPlayer

### Community 61 - "Listados de Torneos"
Cohesion: 0.29
Nodes (5): AdminTournamentsClient(), AdminTournamentsPage(), dynamic, ClubTournamentsPage(), dynamic

### Community 62 - "Migración Cancha Abierta"
Cohesion: 0.29
Nodes (6): `club_requests`, `open_court_courts`, `open_court_events`, `open_court_matches`, `open_court_registrations`, `system_settings`

### Community 64 - "Migración Mensajería y Sponsors"
Cohesion: 0.33
Nodes (5): `contact_messages`, `conversations`, `messages`, `push_subscriptions`, `sponsors`

### Community 65 - "Proxy de Autenticación"
Cohesion: 0.47
Nodes (5): config, extendToken(), JWT_SECRET, proxy(), PUBLIC_ROUTES

### Community 66 - "Script Tablas Desafío"
Cohesion: 0.50
Nodes (4): INDEXES, main(), run(), TABLES

### Community 67 - "Chequeo de Base de Datos"
Cohesion: 0.67
Nodes (3): getConnectionString(), main(), mysql

### Community 68 - "Chequeo de Torneos"
Cohesion: 0.67
Nodes (3): getConnectionString(), main(), mysql

### Community 70 - "Historial de Partidos Americano"
Cohesion: 0.50
Nodes (3): AmericanoMatchHistory(), AmericanoMatchHistoryProps, HistoryFilter

### Community 72 - "Página de Inscripción"
Cohesion: 0.67
Nodes (3): ALLOWED_ROLES, Props, RegisterPage()

### Community 73 - "Borrado de Usuario"
Cohesion: 0.67
Nodes (3): getConnectionString(), main(), mysql

## Knowledge Gaps
- **484 isolated node(s):** `mysql`, `clerk`, `eslintConfig`, `fs`, `content` (+479 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSession` connect `Perfiles, Uploads y Push` to `Gestión de Usuarios Admin`, `Scripts de Migración DB`, `Seeds y Perfiles de Jugador`, `Landing y Feed Social`, `Cancha Abierta Admin`, `Desafío: Canchas y Panel`, `Mensajería y Cancha Abierta Pública`, `Marketplace y Ranking`, `Desafío: CRUD y Gestión`, `Autenticación y Onboarding`, `Partidos Públicos`, `Desafío: Partidos y Resultados`, `Desafío: Vista Pública`, `Reset de Base de Datos`, `Invitaciones de Club`, `Categorías y Promociones`, `Puntos y Ajustes de Torneo`, `Encabezados y Finalización`, `Bracket y Clasificados`, `Setup de Fixture y Presentismo`, `Sponsors`, `Páginas de Torneo e Inscripción`, `Solicitudes de Registro`, `Layout Raíz y Fuentes`, `Crear Torneo y Select UI`, `Admin de Torneos`, `Guardado de Fixture`, `Listados de Torneos`, `Página de Inscripción`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencias UI Base` to `Dependencias de Desarrollo`, `Tarjetas de Partido`, `bcryptjs`, `canvas-confetti`, `clsx`, `date-fns`, `drizzle-orm`, `faker`, `framer-motion`, `hookform resolvers`, `jose`, `Neon Serverless`, `next`, `next-themes`, `pg`, `Radix Dropdown Menu`, `Radix Select`, `Radix Tabs`, `react-dom`, `react-hook-form`, `sonner`, `tailwind-merge`, `TanStack React Query`, `Tipos de web-push`, `web-push`, `zod`, `zustand`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `react` connect `Tarjetas de Partido` to `Dependencias UI Base`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `mysql`, `clerk`, `eslintConfig` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Gestión de Usuarios Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.05153153153153153 - nodes in this community are weakly interconnected._
- **Should `Scripts de Migración DB` be split into smaller, more focused modules?**
  _Cohesion score 0.04590892262125139 - nodes in this community are weakly interconnected._
- **Should `Seeds y Perfiles de Jugador` be split into smaller, more focused modules?**
  _Cohesion score 0.06875 - nodes in this community are weakly interconnected._