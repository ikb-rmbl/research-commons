import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  // Any logged-in user can manage users — appropriate for the single-admin
  // portals this template targets. If you add multiple staff accounts with
  // different trust levels, add a role field and restrict create/update/
  // delete to admins (see Payload access-control docs).
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
