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
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const dayAfterTomorrow = new Date(now)
    dayAfterTomorrow.setDate(now.getDate() + 2)
    const threeDaysLater = new Date(now)
    threeDaysLater.setDate(now.getDate() + 3)
    const fourDaysLater = new Date(now)
    fourDaysLater.setDate(now.getDate() + 4)

    // Función para crear fecha con hora específica
    const createDateWithTime = (baseDate, hours, minutes = 0) => {
      const date = new Date(baseDate)
      date.setHours(hours, minutes, 0, 0)
      return date
    }

    const eventsData = [
      {
        title: "¡Bienvenido a AgendaUN!",
        description: "Tu calendario académico está listo. Organiza tus clases, tareas y parciales de la Universidad Nacional. Este es un evento de ejemplo que puedes editar o eliminar.",
        start: createDateWithTime(now, 7, 0).toISOString(), // 7:00 AM
        end: createDateWithTime(now, 8, 0).toISOString(), // 8:00 AM
        all_day: false,
        location: "Campus UN",
        calendar: calendar.$id,
        etiquette: etiquettes[4].$id,
      },
      {
        title: "Clase Programación (Ejemplo)",
        description: "Ejemplo de clase - Introducción a Python. Agrega aquí tus horarios de clases reales.",
        start: createDateWithTime(tomorrow, 8, 0).toISOString(), // 8:00 AM
        end: createDateWithTime(tomorrow, 10, 0).toISOString(), // 10:00 AM
        all_day: false,
        location: "Aula de Informática 205",
        calendar: calendar.$id,
        etiquette: etiquettes[0].$id,
      },
      {
        title: "Entrega Quiz Matemáticas (Ejemplo)",
        description: "Ejemplo de quiz rápido - 30 minutos. Reemplaza con tus evaluaciones reales.",
        start: createDateWithTime(tomorrow, 11, 0).toISOString(), // 11:00 AM
        end: createDateWithTime(tomorrow, 11, 30).toISOString(), // 11:30 AM
        all_day: false,
        location: "Aula 302",
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Tarea Física (Ejemplo)",
        description: "Ejemplo de tarea - Resolver ejercicios del capítulo 5. Reemplaza con tus tareas reales.",
        start: createDateWithTime(dayAfterTomorrow, 10, 0).toISOString(), // 10:00 AM
        end: createDateWithTime(dayAfterTomorrow, 11, 0).toISOString(), // 11:00 AM
        all_day: false,
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Laboratorio Química (Ejemplo)",
        description: "Ejemplo de laboratorio - Práctica de titulación. Personaliza con tus horarios.",
        start: createDateWithTime(dayAfterTomorrow, 12, 0).toISOString(), // 12:00 PM
        end: createDateWithTime(dayAfterTomorrow, 13, 0).toISOString(), // 1:00 PM
        all_day: false,
        location: "Laboratorio 101",
        calendar: calendar.$id,
        etiquette: etiquettes[0].$id, // Clases
      },
      {
        title: "Parcial Cálculo Diferencial (Ejemplo)",
        description: "Ejemplo de parcial - Temas: Derivadas y aplicaciones. Personaliza con tus materias y fechas reales.",
        start: createDateWithTime(threeDaysLater, 8, 0).toISOString(), // 8:00 AM
        end: createDateWithTime(threeDaysLater, 10, 0).toISOString(), // 10:00 AM
        all_day: false,
        location: "Aula 101 - Edificio de Matemáticas",
        calendar: calendar.$id,
        etiquette: etiquettes[3].$id, // Parciales
      },
      {
        title: "Revisar Correos UN (Ejemplo)",
        description: "Ejemplo de tarea corta - Revisar correo institucional. Personaliza con tus actividades.",
        start: createDateWithTime(threeDaysLater, 11, 0).toISOString(), // 11:00 AM
        end: createDateWithTime(threeDaysLater, 11, 15).toISOString(), // 11:15 AM
        all_day: false,
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Entrega Ensayo Historia (Ejemplo)",
        description: "Ejemplo de entrega - Ensayo sobre la Independencia. Reemplaza con tus trabajos.",
        start: createDateWithTime(fourDaysLater, 9, 0).toISOString(), // 9:00 AM
        end: createDateWithTime(fourDaysLater, 9, 30).toISOString(), // 9:30 AM
        all_day: false,
        location: "Oficina Profesores",
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Entrega Proyecto Final (Ejemplo)",
        description: "Ejemplo de fecha límite para entregar proyecto final. Recordar subir a la plataforma virtual. Puedes editar este evento con tus propias fechas.",
        start: createDateWithTime(fourDaysLater, 12, 0).toISOString(), // 12:00 PM
        end: createDateWithTime(fourDaysLater, 13, 0).toISOString(), // 1:00 PM
        all_day: false,
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
