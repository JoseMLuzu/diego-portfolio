import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Diego Suarez',

  projectId: 'rr2covtm',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenido')
          .items([
            S.documentTypeListItem('release').title('Proyectos musicales'),
            S.listItem()
              .title('Escucha · Antes y después')
              .child(S.document().schemaType('audioComparison').documentId('audio-comparison')),
          ]),
    }),
    visionTool(),
  ],
  document: {
    actions: (actions, context) =>
      context.schemaType === 'audioComparison'
        ? actions.filter((action) => action.action !== 'duplicate')
        : actions,
  },

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((template) => template.schemaType !== 'audioComparison'),
  },
})
