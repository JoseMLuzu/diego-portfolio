import {defineArrayMember, defineField, defineType} from 'sanity'

export const release = defineType({
  name: 'release',
  title: 'Proyectos musicales',
  type: 'document',
  initialValue: {artist: 'Diego Suarez', format: 'Single', visible: true, order: 0},
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'artist',
      title: 'Artista',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'cover',
      title: 'Portada',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required().assetRequired(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Descripción de la imagen',
          type: 'string',
          description: 'Describe la portada para lectores de pantalla.',
          validation: (rule) => rule.required().max(180),
        }),
      ],
    }),
    defineField({
      name: 'format',
      title: 'Formato',
      type: 'string',
      options: {list: ['Single', 'EP', 'Álbum']},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Año',
      type: 'string',
      validation: (rule) => rule.required().regex(/^\d{4}$/, {name: 'año de cuatro cifras'}),
    }),
    defineField({
      name: 'contribution',
      title: 'Mi participación',
      type: 'object',
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'roles',
          title: 'Roles',
          type: 'array',
          of: [defineArrayMember({type: 'string', validation: (rule) => rule.max(35)})],
          description: 'Por ejemplo: Producción, Composición o Mezcla.',
          validation: (rule) => rule.required().min(1).max(3).unique(),
        }),
        defineField({
          name: 'description',
          title: 'Descripción de tu trabajo',
          type: 'text',
          rows: 3,
          description: 'Texto breve para que quepa dentro del disco en celular.',
          validation: (rule) => rule.required().max(160),
        }),
      ],
    }),
    defineField({
      name: 'order',
      title: 'Orden en el carrusel',
      type: 'number',
      description: 'Los números más pequeños aparecen primero.',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'visible',
      title: 'Mostrar en la web',
      type: 'boolean',
      description: 'Desactívalo para ocultar el proyecto sin eliminarlo.',
    }),
  ],
  orderings: [
    {
      title: 'Orden en el carrusel',
      name: 'carouselOrder',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
  ],
  preview: {select: {title: 'title', subtitle: 'artist', media: 'cover'}},
})
