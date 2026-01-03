export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Auth
    welcome: "Welcome to Wardrobe",
    signIn: "Sign In",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    name: "Name",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    continueWith: "Or continue with",
    signingIn: "Signing in...",
    signingUp: "Creating account...",
    
    // Navigation
    wardrobe: "Wardrobe",
    outfits: "Outfits",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign Out",
    
    // Wardrobe
    myWardrobe: "My Wardrobe",
    addClothing: "Add Clothing",
    allItems: "All Items",
    categories: "Categories",
    noClothes: "No clothes yet",
    addFirstItem: "Add your first clothing item",
    
    // Clothing form
    clothingName: "Name",
    category: "Category",
    selectCategory: "Select category",
    createCategory: "Create category",
    size: "Size",
    sizeType: "Size Type",
    letterSize: "Letter (S, M, L...)",
    numericSize: "Numeric",
    color: "Color",
    brand: "Brand",
    notes: "Notes",
    isAccessory: "This is an accessory",
    clothingPhoto: "Clothing Photo",
    wearingPhoto: "Photo Wearing It (Optional)",
    uploadPhoto: "Upload Photo",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    
    // Outfits
    myOutfits: "My Outfits",
    createOutfit: "Create Outfit",
    noOutfits: "No outfits yet",
    buildFirstOutfit: "Build your first outfit",
    outfitName: "Outfit Name",
    selectItems: "Select Items",
    favorites: "Favorites",
    allOutfits: "All Outfits",
    markFavorite: "Mark as favorite",
    tags: "Tags",
    addTag: "Add tag",
    
    // Profile
    myProfile: "My Profile",
    height: "Height (cm)",
    weight: "Weight (kg)",
    stylePreferences: "Style Preferences",
    preferredLanguage: "Preferred Language",
    english: "English",
    spanish: "Spanish",
    updateProfile: "Update Profile",
    
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    required: "Required",
    optional: "Optional",
    search: "Search",
    filter: "Filter",
    
    // Messages
    loginSuccess: "Welcome back!",
    signupSuccess: "Account created successfully!",
    profileUpdated: "Profile updated!",
    clothingAdded: "Clothing added!",
    clothingUpdated: "Clothing updated!",
    clothingDeleted: "Clothing deleted!",
    outfitCreated: "Outfit created!",
    outfitUpdated: "Outfit updated!",
    outfitDeleted: "Outfit deleted!",
    categoryCreated: "Category created!",
  },
  es: {
    // Auth
    welcome: "Bienvenido a Armario",
    signIn: "Iniciar Sesión",
    signUp: "Registrarse",
    email: "Correo Electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar Contraseña",
    name: "Nombre",
    forgotPassword: "¿Olvidaste tu contraseña?",
    noAccount: "¿No tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    continueWith: "O continúa con",
    signingIn: "Iniciando sesión...",
    signingUp: "Creando cuenta...",
    
    // Navigation
    wardrobe: "Armario",
    outfits: "Outfits",
    profile: "Perfil",
    settings: "Configuración",
    signOut: "Cerrar Sesión",
    
    // Wardrobe
    myWardrobe: "Mi Armario",
    addClothing: "Añadir Prenda",
    allItems: "Todas las Prendas",
    categories: "Categorías",
    noClothes: "Sin prendas aún",
    addFirstItem: "Añade tu primera prenda",
    
    // Clothing form
    clothingName: "Nombre",
    category: "Categoría",
    selectCategory: "Seleccionar categoría",
    createCategory: "Crear categoría",
    size: "Talla",
    sizeType: "Tipo de Talla",
    letterSize: "Letra (S, M, L...)",
    numericSize: "Numérico",
    color: "Color",
    brand: "Marca",
    notes: "Notas",
    isAccessory: "Es un accesorio",
    clothingPhoto: "Foto de la Prenda",
    wearingPhoto: "Foto Puesta (Opcional)",
    uploadPhoto: "Subir Foto",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    
    // Outfits
    myOutfits: "Mis Outfits",
    createOutfit: "Crear Outfit",
    noOutfits: "Sin outfits aún",
    buildFirstOutfit: "Crea tu primer outfit",
    outfitName: "Nombre del Outfit",
    selectItems: "Seleccionar Prendas",
    favorites: "Favoritos",
    allOutfits: "Todos los Outfits",
    markFavorite: "Marcar como favorito",
    tags: "Etiquetas",
    addTag: "Añadir etiqueta",
    
    // Profile
    myProfile: "Mi Perfil",
    height: "Altura (cm)",
    weight: "Peso (kg)",
    stylePreferences: "Preferencias de Estilo",
    preferredLanguage: "Idioma Preferido",
    english: "Inglés",
    spanish: "Español",
    updateProfile: "Actualizar Perfil",
    
    // Common
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    required: "Requerido",
    optional: "Opcional",
    search: "Buscar",
    filter: "Filtrar",
    
    // Messages
    loginSuccess: "¡Bienvenido de nuevo!",
    signupSuccess: "¡Cuenta creada exitosamente!",
    profileUpdated: "¡Perfil actualizado!",
    clothingAdded: "¡Prenda añadida!",
    clothingUpdated: "¡Prenda actualizada!",
    clothingDeleted: "¡Prenda eliminada!",
    outfitCreated: "¡Outfit creado!",
    outfitUpdated: "¡Outfit actualizado!",
    outfitDeleted: "¡Outfit eliminado!",
    categoryCreated: "¡Categoría creada!",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, language: Language = 'en'): string {
  return translations[language][key] || translations.en[key] || key;
}