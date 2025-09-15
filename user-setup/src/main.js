import { Client, Databases, ID, Permission, Role } from "node-appwrite"

// Constantes para colores y vistas predefinidas
const Colors = {
  GRAY: "gray",
  BLUE: "blue", 
  RED: "red",
  GREEN: "green",
  PURPLE: "purple",
  ORANGE: "orange",
  PINK: "pink",
  TEAL: "teal",
  YELLOW: "yellow",
  LIME: "lime",
}

const DefaultView = {
  AGENDA: "agenda",
  MONTH: "month", 
  WEEK: "week",
  DAY: "day",
}

const setupClient = (req) => {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY)
}

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID
const CALENDARS_COLLECTION_ID = process.env.APPWRITE_CALENDARS_COLLECTION_ID
const ETIQUETTES_COLLECTION_ID = process.env.APPWRITE_ETIQUETTES_COLLECTION_ID
const EVENTS_COLLECTION_ID = process.env.APPWRITE_EVENTS_COLLECTION_ID

export default async ({ req, res, log, error }) => {
  try {
    const client = setupClient(req)
    const databases = new Databases(client)
    
    const payload = req.bodyJson || {}
    
    log(`Configuración inicial completada`)
    log(`Trigger:`, req.headers['x-appwrite-trigger'])
    
    const userId = payload.userId || payload.$id
    
    if (!userId) {
      error("No se proporcionó userId en el evento")
      return res.json({
        success: false,
        error: "No userId provided in event",
      }, 400)
    }

    log(`Configurando usuario: ${userId}`)

    // 1. Crear perfil del usuario
    const profile = await databases.createDocument(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      ID.unique(),
      { user_id: userId }
    )

    log(`Perfil creado: ${profile.$id}`)

    // 2. Crear calendario personal
    const calendar = await databases.createDocument(
      DATABASE_ID,
      CALENDARS_COLLECTION_ID,
      ID.unique(),
      {
        name: "Mi Calendario Personal",
        slug: `personal-${userId}`,
        defaultView: DefaultView.MONTH,
        requireConfig: false,
        profile: profile.$id,
      }
    )

    log(`Calendario creado: ${calendar.$id}`)

    // 3. Crear etiquetas predeterminadas
    const etiquettesData = [
      { name: "Personal", color: Colors.BLUE, isActive: true, calendar: calendar.$id },
      { name: "Trabajo", color: Colors.RED, isActive: true, calendar: calendar.$id },
      { name: "Estudios", color: Colors.GREEN, isActive: true, calendar: calendar.$id },
    ]

    const etiquettes = await Promise.all(
      etiquettesData.map(data => 
        databases.createDocument(
          DATABASE_ID,
          ETIQUETTES_COLLECTION_ID,
          ID.unique(),
          data,
          [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId))
          ]
        )
      )
    )

    log(`Etiquetas creadas: ${etiquettes.length}`)

    // 4. Crear eventos de ejemplo
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const eventsData = [
      {
        title: "¡Bienvenido a AgendaUN!",
        description: "Este es un evento de ejemplo. Puedes editarlo o eliminarlo desde tu calendario.",
        start: now.toISOString(),
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Campus Universidad",
        calendar: calendar.$id,
        etiquette: etiquettes[0].$id,
      },
      {
        title: "Evento de todo el día",
        description: "Ejemplo de evento que dura todo el día",
        start: tomorrow.toISOString(),
        end: tomorrow.toISOString(),
        all_day: true,
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id,
      },
      {
        title: "Reunión de trabajo",
        description: "Ejemplo de evento de trabajo con duración específica",
        start: new Date(nextWeek.getTime() + 9 * 60 * 60 * 1000).toISOString(),
        end: new Date(nextWeek.getTime() + 10 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Sala de reuniones",
        calendar: calendar.$id,
        etiquette: etiquettes[2].$id,
      },
    ]

    const events = await Promise.all(
      eventsData.map(data => 
        databases.createDocument(
          DATABASE_ID,
          EVENTS_COLLECTION_ID,
          ID.unique(),
          data,
          [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId))
          ]
        )
      )
    )

    log(`Eventos creados: ${events.length}`)
    log(`Usuario ${userId} configurado exitosamente`)

    return res.json({
      success: true,
      message: "Usuario configurado exitosamente",
      data: {
        profileId: profile.$id,
        calendarId: calendar.$id,
        etiquettesCount: etiquettes.length,
        eventsCount: events.length,
      },
    })

  } catch (err) {
    error(`Error configurando usuario: ${err.message}`)
    return res.json({
      success: false,
      error: err.message,
    }, 500)
  }
}
