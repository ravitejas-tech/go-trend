export const ROUTES = {
  home: "/",
  templates: "/templates",
  template: (slug: string) => `/templates/${slug}`,
  history: "/history",
  admin: "/admin",
  adminTemplates: "/admin/templates",
} as const;

export const API_ROUTES = {
  generations: "/api/generations",
  generation: (id: string) => `/api/generations/${id}`,
  uploads: "/api/uploads",
} as const;
