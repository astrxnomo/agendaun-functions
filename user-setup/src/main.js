import { Client, Databases, ID, Permission, Role } from "node-appwrite"

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
        name: "Mi Calendario",
        slug: `personal-${userId}`,
        defaultView: "week",
        requireConfig: false,
        profile: profile.$id,
      }
    )

    log(`Calendario creado: ${calendar.$id}`)

    // 3. Crear etiquetas predeterminadas para estudiante UN
    const etiquettesData = [
      { name: "Clases", color: "blue", isActive: true, calendar: calendar.$id },
      { name: "Tareas", color: "orange", isActive: true, calendar: calendar.$id },
      { name: "Proyectos", color: "purple", isActive: true, calendar: calendar.$id },
      { name: "Parciales", color: "red", isActive: true, calendar: calendar.$id },
      { name: "Personal", color: "green", isActive: true, calendar: calendar.$id },
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
    const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const fourDaysLater = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    const eventsData = [
      {
        title: "¡Bienvenido a AgendaUN!",
        description: "Tu calendario académico está listo. Organiza tus clases, tareas y parciales de la Universidad Nacional. Este es un evento de ejemplo que puedes editar o eliminar.",
        start: now.toISOString(),
        end: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Campus UN",
        calendar: calendar.$id,
        etiquette: etiquettes[4].$id, // Personal
      },
      {
        title: "Clase Programación (Ejemplo)",
        description: "Ejemplo de clase - Introducción a Python. Agrega aquí tus horarios de clases reales.",
        start: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000).toISOString(),
        end: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Aula de Informática 205",
        calendar: calendar.$id,
        etiquette: etiquettes[0].$id, // Clases
      },
      {
        title: "Tarea Física (Ejemplo)",
        description: "Ejemplo de tarea - Resolver ejercicios del capítulo 5. Reemplaza con tus tareas reales.",
        start: dayAfterTomorrow.toISOString(),
        end: new Date(dayAfterTomorrow.getTime() + 23 * 60 * 60 * 1000).toISOString(),
        all_day: true,
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Parcial Cálculo Diferencial (Ejemplo)",
        description: "Ejemplo de parcial - Temas: Derivadas y aplicaciones. Personaliza con tus materias y fechas reales.",
        start: new Date(threeDaysLater.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        end: new Date(threeDaysLater.getTime() + 10 * 60 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Aula 101 - Edificio de Matemáticas",
        calendar: calendar.$id,
        etiquette: etiquettes[3].$id, // Parciales
      },
      {
        title: "Entrega Proyecto Final (Ejemplo)",
        description: "Ejemplo de fecha límite para entregar proyecto final. Recordar subir a la plataforma virtual. Puedes editar este evento con tus propias fechas.",
        start: fourDaysLater.toISOString(),
        end: new Date(fourDaysLater.getTime() + 23 * 60 * 60 * 1000).toISOString(),
        all_day: true,
        calendar: calendar.$id,
        etiquette: etiquettes[2].$id, // Proyectos
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
