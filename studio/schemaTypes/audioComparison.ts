import {defineField, defineType} from 'sanity'

export const audioComparison = defineType({
  name: 'audioComparison',
  title: 'Escucha · Antes y después',
  type: 'document',
  initialValue: {visible: true},
  fields: [
    defineField({
      name: 'title',
      title: 'Título del fragmento',
      type: 'string',
      validation: (rule) => rule.required().max(70),
    }),
    defineField({
      name: 'before',
      title: 'A · Antes',
      type: 'file',
      options: {accept: '.mp3,.wav,.m4a,.aac'},
      description: 'Versión original. Usa el mismo fragmento y punto de inicio en ambos archivos.',
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'after',
      title: 'B · Después',
      type: 'file',
      options: {accept: '.mp3,.wav,.m4a,.aac'},
      description:
        'Versión trabajada. MP3 es práctico para móvil. Iguala el volumen percibido para facilitar una comparación justa.',
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({name: 'visible', title: 'Mostrar en la web', type: 'boolean'}),
  ],
  preview: {
    select: {title: 'title'},
    prepare: ({title}) => ({title: title || 'Escucha', subtitle: 'Comparación A/B'}),
  },
})
