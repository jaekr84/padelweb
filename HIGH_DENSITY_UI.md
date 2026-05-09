# Estándar de Diseño: Alta Densidad (High-Density UI)

Este documento define los estándares visuales para las interfaces administrativas del proyecto, optimizadas para tablets y gestión masiva de datos ("Dense-First").

## 1. Tipografía y Jerarquía
| Elemento | Clase Tailwind | Uso |
| :--- | :--- | :--- |
| **Título Principal (H1)** | `text-2xl md:text-3xl font-black` | Nombre del torneo o página principal. |
| **Título de Sección (H2/H3)** | `text-xl md:text-2xl font-black` | Títulos dentro de tarjetas o pasos del stepper. |
| **Subtítulos / Etiquetas** | `text-[9px] font-black tracking-widest` | Contexto debajo de títulos principales. |
| **Texto Secundario** | `text-[8px] font-bold` | Información de apoyo (ej. "Equipo: Nombre"). |
| **Datos en Tablas** | `text-xs font-black` | Nombres de jugadores o valores principales. |

## 2. Contenedores y Espaciado
| Elemento | Clase Tailwind | Racional |
| :--- | :--- | :--- |
| **Padding General (Card)** | `p-4 md:p-6` | Evita el desperdicio de espacio vertical/horizontal. |
| **Margen Inferior Título** | `mb-6` | Reduce el aire entre el encabezado y el contenido. |
| **Fila de Tabla (Asistencia)** | `py-1.5 px-4` | Maximiza la cantidad de filas visibles por pantalla. |
| **Espaciado entre Items** | `space-y-4` | Mantiene la legibilidad sin separar demasiado los bloques. |

## 3. Componentes de Acción (Botones)
| Tipo | Clase Tailwind | Dimensiones |
| :--- | :--- | :--- |
| **Acción Principal (Continuar)** | `h-12` o `py-3` | Botón robusto pero no exagerado (antes h-16). |
| **Botón de Fila (Tabla)** | `w-8 h-8 rounded-lg` | Tamaño ideal para interacción táctil en tablets. |
| **Iconos en Botones** | `w-3.5 h-3.5` o `w-4 h-4` | Proporcional al tamaño del botón compacto. |
| **Radio de Esquina (Radius)** | `rounded-xl` o `rounded-2xl` | Moderno pero contenido, evitando el estilo "píldora" excesivo. |

## 4. Layout y Grid
- **Columnas**: Preferir `grid-cols-3` sobre `grid-cols-4` para mantener el ancho de los nombres legible.
- **Max-Width**: Limitar contenedores principales a `max-w-6xl` para evitar que las líneas de texto se estiren demasiado en monitores anchos.
- **Sticky Footer**: Altura máxima de `h-16` para no ocultar contenido crítico de la lista.

---
*Nota: Este estándar debe aplicarse a todos los módulos de gestión (Torneos, Inventario, POS) para garantizar una experiencia de usuario coherente.*
