import { Client, Databases, ID } from "node-appwrite"

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

const databases = new Databases(client)

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID
const CALENDARS_COLLECTION_ID = process.env.APPWRITE_CALENDARS_COLLECTION_ID
const ETIQUETTES_COLLECTION_ID = process.env.APPWRITE_ETIQUETTES_COLLECTION_ID
const EVENTS_COLLECTION_ID = process.env.APPWRITE_EVENTS_COLLECTION_ID

const setupUser = async ({ req, res, log, error }) => {
  try {
    if (!DATABASE_ID) {
      throw new Error("DATABASE_ID no está configurado")
    }
    
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
    log(`Usando database: ${DATABASE_ID}`)

    const profileData = {
      user_id: userId,
    }

    const profile = await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: PROFILES_COLLECTION_ID,
      documentId: ID.unique(),
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

    const calendar = await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: CALENDARS_COLLECTION_ID,
      documentId: ID.unique(),
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
      const etiquette = await databases.createDocument({
        databaseId: DATABASE_ID,
        collectionId: ETIQUETTES_COLLECTION_ID,
        documentId: ID.unique(),
        data: etiquetteData,
        permissions: [`read("user:${userId}")`, `update("user:${userId}")`, `delete("user:${userId}")`],
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
      const event = await databases.createDocument({
        databaseId: DATABASE_ID,
        collectionId: EVENTS_COLLECTION_ID,
        documentId: ID.unique(),
        data: eventData,
        permissions: [`read("user:${userId}")`, `update("user:${userId}")`, `delete("user:${userId}")`],
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
    log(`Stack trace: ${err.stack}`)
    return res.json({
      success: false,
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    })
  }
}

export default setupUser
