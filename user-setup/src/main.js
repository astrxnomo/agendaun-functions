import { Client, ID, TablesDB } from "node-appwrite"

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

const client = new Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? "")
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID ?? "")
  .setKey(process.env.APPWRITE_API_KEY ?? "")

const tablesDB = new TablesDB(client)

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const PROFILES_TABLE_ID = process.env.APPWRITE_PROFILES_TABLE_ID
const CALENDARS_TABLE_ID = process.env.APPWRITE_CALENDARS_TABLE_ID
const ETIQUETTES_TABLE_ID = process.env.APPWRITE_ETIQUETTES_TABLE_ID
const EVENTS_TABLE_ID = process.env.APPWRITE_EVENTS_TABLE_ID

const setupUser = async ({ req, res, log, error }) => {
  try {
    const payload = JSON.parse(req.body || "{}")
    const userId = payload.userId || payload.$id

    if (!userId) {
      error("No se proporcionó userId en el evento")
      return res.json({
        success: false,
        error: "No userId provided in event",
      })
    }

    log(`Configurando usuario: ${userId}`)

    const profileData = {
      user_id: userId,
      sede: null,
      faculty: null,
      program: null,
    }

    const profile = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE_ID,
      rowId: ID.unique(),
      data: profileData,
    })

    log(`Perfil creado: ${profile.$id}`)

    const calendarData = {
      name: "Mi Calendario Personal",
      slug: `personal-${userId}`,
      defaultView: DefaultView.MONTH,
      requireConfig: false,
      profile: profile.$id,
    }

    const calendar = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: CALENDARS_TABLE_ID,
      rowId: ID.unique(),
      data: calendarData,
    })

    log(`Calendario creado: ${calendar.$id}`)

    const etiquettesData = [
      {
        name: "Personal",
        color: Colors.BLUE,
        isActive: true,
        calendar: calendar.$id,
      },
      {
        name: "Trabajo",
        color: Colors.RED,
        isActive: true,
        calendar: calendar.$id,
      },
      {
        name: "Estudios",
        color: Colors.GREEN,
        isActive: true,
        calendar: calendar.$id,
      },
    ]

    const createdEtiquettes = []
    for (const etiquetteData of etiquettesData) {
      const etiquette = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: ETIQUETTES_TABLE_ID,
        rowId: ID.unique(),
        data: etiquetteData,
      })
      createdEtiquettes.push(etiquette)
      log(`Etiqueta creada: ${etiquette.name}`)
    }

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const eventsData = [
      {
        title: "¡Bienvenido a AgendaUN!",
        description:
          "Este es un evento de ejemplo. Puedes editarlo o eliminarlo desde tu calendario.",
        start: now.toISOString(),
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Campus Universidad",
        calendar: calendar.$id,
        etiquette: createdEtiquettes[0].$id,
      },
      {
        title: "Evento de todo el día",
        description: "Ejemplo de evento que dura todo el día",
        start: tomorrow.toISOString(),
        end: tomorrow.toISOString(),
        all_day: true,
        calendar: calendar.$id,
        etiquette: createdEtiquettes[1].$id,
      },
      {
        title: "Reunión de trabajo",
        description: "Ejemplo de evento de trabajo con duración específica",
        start: new Date(nextWeek.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
        end: new Date(nextWeek.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10 AM
        all_day: false,
        location: "Sala de reuniones",
        calendar: calendar.$id,
        etiquette: createdEtiquettes[2].$id,
      },
    ]

    const createdEvents = []
    for (const eventData of eventsData) {
      const event = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: EVENTS_TABLE_ID,
        rowId: ID.unique(),
        data: eventData,
      })
      createdEvents.push(event)
      log(`Evento creado: ${event.title}`)
    }

    log(`Usuario ${userId} configurado exitosamente`)

    return res.json({
      success: true,
      message: "Usuario configurado exitosamente",
      data: {
        profileId: profile.$id,
        calendarId: calendar.$id,
        etiquettesCount: createdEtiquettes.length,
        eventsCount: createdEvents.length,
      },
    })
  } catch (err) {
    error(`Error configurando usuario: ${err.message}`)
    return res.json({
      success: false,
      error: err.message,
    })
  }
}

export default setupUser
