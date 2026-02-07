import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/auth';

// Verificar credenciales de Cloudinary al iniciar
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET;

// Configurar Cloudinary solo si hay credenciales
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

// Configuración de seguridad
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Límite de 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Roles permitidos para subir archivos
const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

/**
 * Valida el tipo de archivo por su contenido (magic bytes)
 */
function validateImageMagicBytes(buffer) {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'image/webp';
    }
  }

  return null;
}

/**
 * Sanitiza el nombre del archivo
 */
function sanitizeFileName(fileName) {
  // Remover caracteres peligrosos, solo permitir alfanuméricos, guiones y puntos
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevenir path traversal
    .substring(0, 100); // Limitar longitud
}

export async function POST(req) {
  try {
    // 0. CONFIGURACIÓN: Verificar que Cloudinary esté configurado
    if (!isCloudinaryConfigured) {
      console.error('[UPLOAD ERROR] Cloudinary no configurado. Variables requeridas:',
        '\n  - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:', CLOUDINARY_CLOUD_NAME ? '✓' : '✗ FALTA',
        '\n  - CLOUDINARY_API_KEY:', CLOUDINARY_API_KEY ? '✓' : '✗ FALTA',
        '\n  - CLOUDINARY_API_SECRET:', CLOUDINARY_API_SECRET ? '✓' : '✗ FALTA'
      );
      return NextResponse.json(
        { error: 'Servicio de imágenes no configurado. Contacta al administrador.' },
        { status: 503 }
      );
    }

    // 1. AUTENTICACIÓN: Verificar sesión
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión.' },
        { status: 401 }
      );
    }

    // 2. AUTORIZACIÓN: Verificar rol
    const userRole = session.user.role;
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'No tienes permisos para subir archivos.' },
        { status: 403 }
      );
    }

    // 3. Obtener archivo del formulario
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo.' },
        { status: 400 }
      );
    }

    // 4. VALIDACIÓN: Tamaño del archivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024}MB).` },
        { status: 400 }
      );
    }

    // 5. VALIDACIÓN: Tipo MIME declarado
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WebP, GIF).' },
        { status: 400 }
      );
    }

    // 6. VALIDACIÓN: Extensión del archivo
    const fileName = file.name || '';
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Extensión de archivo no permitida.' },
        { status: 400 }
      );
    }

    // 7. Convertir a buffer para validación profunda
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 8. VALIDACIÓN: Magic bytes (contenido real del archivo)
    const detectedType = validateImageMagicBytes(buffer);
    if (!detectedType) {
      return NextResponse.json(
        { error: 'El archivo no es una imagen válida.' },
        { status: 400 }
      );
    }

    // 9. Sanitizar nombre del archivo para el log
    const safeName = sanitizeFileName(fileName);

    // 10. Subir a Cloudinary con timeout
    const uploadResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Cloudinary no respondió en 30 segundos'));
      }, 30000);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'categories',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          max_bytes: MAX_FILE_SIZE,
          timeout: 30000,
        },
        (error, result) => {
          clearTimeout(timeout);
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // Log de auditoría
    console.log(`[UPLOAD] Usuario ${session.user.id} (${userRole}) subió: ${safeName}`);

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
    });

  } catch (error) {
    console.error('[UPLOAD ERROR]:', error);

    // Errores específicos de Cloudinary
    if (error.http_code === 401 || error.message?.includes('Invalid')) {
      console.error('[UPLOAD] Credenciales de Cloudinary inválidas');
      return NextResponse.json(
        { error: 'Error de configuración del servicio de imágenes.' },
        { status: 503 }
      );
    }

    if (error.http_code === 502 || error.name === 'UnexpectedResponse') {
      console.error('[UPLOAD] Error de conexión con Cloudinary. Verifica las credenciales.');
      return NextResponse.json(
        { error: 'Error de conexión con el servicio de imágenes. Verifica la configuración.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('Timeout')) {
      console.error('[UPLOAD] Timeout al conectar con Cloudinary');
      return NextResponse.json(
        { error: 'El servicio de imágenes no responde. Intenta de nuevo.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Error al subir la imagen.' },
      { status: 500 }
    );
  }
}
