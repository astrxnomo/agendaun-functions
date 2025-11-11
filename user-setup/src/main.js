import { Client, ID, Permission, Role, TablesDB, Users } from "node-appwrite"

const setupClient = (req) => {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY)
}

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const PROFILES_TABLE_ID = process.env.APPWRITE_PROFILES_TABLE_ID
const CALENDARS_TABLE_ID = process.env.APPWRITE_CALENDARS_TABLE_ID
const ETIQUETTES_TABLE_ID = process.env.APPWRITE_ETIQUETTES_TABLE_ID
const CALENDAR_EVENTS_TABLE_ID = process.env.APPWRITE_CALENDAR_EVENTS_TABLE_ID

export default async ({ req, res, log, error }) => {
  try {
    const client = setupClient(req)
    const databases = new TablesDB(client)
    const users = new Users(client)
    
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

    // Obtener información del usuario para el email
    const user = await users.get(userId)
    const userEmail = user.email

    // 1. Crear perfil del usuario
    const profile = await databases.createRow(
      DATABASE_ID,
      PROFILES_TABLE_ID,
      ID.unique(),
      { 
        user_id: userId,
        email: userEmail
      }
    )

    log(`Perfil creado: ${profile.$id}`)

    // 2. Crear calendario personal
    const calendar = await databases.createRow(
      DATABASE_ID,
      CALENDARS_TABLE_ID,
      ID.unique(),
      {
        name: "Mi Calendario",
        slug: `personal-${userId}`,
        defaultView: "week",
        requireConfig: false,
        profile: profile.$id,
      },
      [
        Permission.read(Role.user(userId)),
      ]
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
        databases.createRow(
          DATABASE_ID,
          ETIQUETTES_TABLE_ID,
          ID.unique(),
          data,
          [
            Permission.read(Role.user(userId)),
            Permission.write(Role.user(userId)),
          ]
        )
      )
    )

    log(`Etiquetas creadas: ${etiquettes.length}`)

    // 4. Crear eventos de ejemplo en la semana actual
    // Calcular el lunes de la semana actual
    const today = new Date()
    const currentDay = today.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + daysToMonday)
    
    // Función para crear fecha en la semana actual con hora específica en UTC-5
    const createWeekDate = (daysFromMonday, hours, minutes = 0) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + daysFromMonday)
      // Ajustar a UTC-5: agregar 5 horas para que al convertir a UTC quede en Colombia
      date.setHours(hours + 5, minutes, 0, 0)
      return date
    }

    const eventsData = [
      {
        title: "¡Bienvenido a AgendaUN!",
        description: "Tu calendario académico está listo. Organiza tus clases, tareas y parciales de la Universidad Nacional. Este es un evento de ejemplo que puedes editar o eliminar.",
        start: createWeekDate(0, 7, 0), // Lunes 7:00 AM
        end: createWeekDate(0, 8, 0), // Lunes 8:00 AM
        all_day: false,
        location: "Campus UN",
        calendar: calendar.$id,
        etiquette: etiquettes[4].$id, // Personal
      },
      {
        title: "Clase Programación (Ejemplo)",
        description: "Ejemplo de clase - Introducción a Python. Agrega aquí tus horarios de clases reales.",
        start: createWeekDate(0, 8, 0), // Lunes 8:00 AM
        end: createWeekDate(0, 10, 0), // Lunes 10:00 AM
        all_day: false,
        location: "Aula de Informática 205",
        calendar: calendar.$id,
        etiquette: etiquettes[0].$id, // Clases
      },
      {
        title: "Entrega Quiz Matemáticas (Ejemplo)",
        description: "Ejemplo de quiz rápido - 30 minutos. Reemplaza con tus evaluaciones reales.",
        start: createWeekDate(1, 11, 0), // Martes 11:00 AM
        end: createWeekDate(1, 11, 30), // Martes 11:30 AM
        all_day: false,
        location: "Aula 302",
        calendar: calendar.$id,
        etiquette: etiquettes[1].$id, // Tareas
      },
      {
        title: "Parcial Cálculo Diferencial (Ejemplo)",
        description: "Ejemplo de parcial - Temas: Derivadas y aplicaciones. Personaliza con tus materias y fechas reales.",
        start: createWeekDate(2, 8, 0), // Miércoles 8:00 AM
        end: createWeekDate(2, 10, 0), // Miércoles 10:00 AM
        all_day: false,
        location: "Aula 101 - Edificio de Matemáticas",
        calendar: calendar.$id,
        etiquette: etiquettes[3].$id, // Parciales
      },
      {
        title: "Entrega Proyecto Final (Ejemplo)",
        description: "Ejemplo de fecha límite para entregar proyecto final. Recordar subir a la plataforma virtual. Puedes editar este evento con tus propias fechas.",
        start: createWeekDate(4, 10, 0), // Viernes 10:00 AM
        end: createWeekDate(4, 11, 0), // Viernes 11:00 AM
        all_day: false,
        calendar: calendar.$id,
        etiquette: etiquettes[2].$id, // Proyectos
      },
    ]

    const events = await Promise.all(
      eventsData.map(data => 
        databases.createRow(
          DATABASE_ID,
          CALENDAR_EVENTS_TABLE_ID,
          ID.unique(),
          data,
          [
            Permission.read(Role.user(userId)),
            Permission.write(Role.user(userId)),
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
