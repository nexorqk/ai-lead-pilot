import bcrypt from "bcryptjs";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildApp, type AppConfig } from "./app.js";

const prisma = new PrismaClient();
const config: AppConfig = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  WEB_ORIGIN: "http://localhost:3000",
  SESSION_SECRET: "test_session_secret_change_me_32_chars",
  SESSION_COOKIE_NAME: "leadpilot_session",
  SESSION_TTL_DAYS: 7,
  PUBLIC_RATE_LIMIT_MAX: 100,
  PUBLIC_RATE_LIMIT_WINDOW: "1 minute",
  AUTH_RATE_LIMIT_MAX: 100,
  AUTH_RATE_LIMIT_WINDOW: "1 minute",
  AI_PROVIDER: "mock",
  OPENAI_MODEL: "gpt-4o-mini"
};

async function seedTestData() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const organization = await prisma.organization.create({
    data: {
      name: `Integration Org ${suffix}`,
      slug: `integration-org-${suffix}`,
      timezone: "UTC",
      services: {
        create: {
          name: "Consultation",
          slug: "consultation",
          durationMin: 60
        }
      },
      availabilityRules: {
        create: {
          dayOfWeek: 2,
          startTime: "09:00",
          endTime: "17:00"
        }
      }
    },
    include: { services: true }
  });

  const user = await prisma.user.create({
    data: {
      email: `owner-${suffix}@example.com`,
      name: "Integration Owner",
      passwordHash: await bcrypt.hash("password-123", 4),
      memberships: {
        create: {
          organizationId: organization.id,
          role: "owner"
        }
      }
    }
  });

  await prisma.notificationPreference.create({
    data: {
      organizationId: organization.id,
      type: "lead_created",
      channel: "mock_email",
      recipient: user.email
    }
  });

  const service = organization.services[0];
  if (!service) {
    throw new Error("Expected seed service to be created");
  }

  return { organization, user, service };
}

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("API integration", () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({ where: { organization: { slug: { startsWith: "integration-org-" } } } });
    await prisma.notification.deleteMany({ where: { organization: { slug: { startsWith: "integration-org-" } } } });
    await prisma.passwordSetupToken.deleteMany({
      where: {
        organizationMember: {
          organization: { slug: { startsWith: "integration-org-" } }
        }
      }
    });
  });

  it("protects admin lead list without a session", async () => {
    const { organization } = await seedTestData();
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api/leads" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.requestId).toBeTruthy();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("creates a public lead, records notification and audit, then lists it after login", async () => {
    const { organization, user } = await seedTestData();
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const createLead = await app.inject({
      method: "POST",
      url: "/api/leads",
      payload: {
        customer: { name: "Lead Customer", email: "lead@example.com" },
        serviceSlug: "consultation",
        message: "I need a consultation this week, preferably Tuesday morning.",
        preferredDate: "2026-05-05",
        preferredTime: "10:00"
      }
    });

    expect(createLead.statusCode).toBe(201);
    const created = createLead.json<{ id: string }>();
    expect(created.id).toBeTruthy();

    const notifications = await prisma.notification.findMany({ where: { organizationId: organization.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.status).toBe("pending");

    const audit = await prisma.auditLog.findMany({ where: { organizationId: organization.id, action: "lead.created" } });
    expect(audit).toHaveLength(1);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: "password-123" }
    });
    expect(login.statusCode).toBe(200);
    const cookie = login.headers["set-cookie"];

    const leads = await app.inject({
      method: "GET",
      url: "/api/leads",
      headers: { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" }
    });

    expect(leads.statusCode).toBe(200);
    expect(leads.json<Array<{ id: string }>>().some((lead) => lead.id === created.id)).toBe(true);
  });

  it("creates public organization leads by slug", async () => {
    const { organization } = await seedTestData();
    app = await buildApp(config, prisma);
    await app.ready();

    const publicOrganization = await app.inject({
      method: "GET",
      url: `/api/public/organizations/${organization.slug}`
    });
    expect(publicOrganization.statusCode).toBe(200);
    expect(publicOrganization.json<{ slug: string; services: Array<{ slug: string }> }>().slug).toBe(organization.slug);
    expect(publicOrganization.json<{ slug: string; services: Array<{ slug: string }> }>().services.some((service) => service.slug === "consultation")).toBe(true);

    const createLead = await app.inject({
      method: "POST",
      url: `/api/public/organizations/${organization.slug}/leads`,
      payload: {
        customer: { name: "Slug Customer", email: "slug-customer@example.com" },
        serviceSlug: "consultation",
        message: "I need a consultation from this specific organization page.",
        preferredDate: "2026-05-06",
        preferredTime: "11:00"
      }
    });
    expect(createLead.statusCode).toBe(201);

    const lead = await prisma.lead.findUnique({
      where: { id: createLead.json<{ id: string }>().id },
      include: { customer: true }
    });
    expect(lead?.organizationId).toBe(organization.id);
    expect(lead?.customer.email).toBe("slug-customer@example.com");

    const missing = await app.inject({
      method: "GET",
      url: "/api/public/organizations/not-a-real-org"
    });
    expect(missing.statusCode).toBe(404);
  });

  it("lets owners update the public organization profile", async () => {
    const { organization, user, service } = await seedTestData();
    const competing = await seedTestData();
    app = await buildApp(config, prisma);
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: "password-123" }
    });
    const cookie = login.headers["set-cookie"];
    const headers = { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" };

    const profile = await app.inject({
      method: "GET",
      url: "/api/organization/profile",
      headers
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json<{ slug: string; services: Array<{ active: boolean }> }>().slug).toBe(organization.slug);
    expect(profile.json<{ slug: string; services: Array<{ active: boolean }> }>().services[0]?.active).toBe(true);

    const update = await app.inject({
      method: "PATCH",
      url: "/api/organization/profile",
      headers,
      payload: {
        name: "Updated Integration Org",
        slug: `${organization.slug}-updated`,
        timezone: "Europe/Minsk",
        services: [
          {
            id: service.id,
            name: "Priority Consultation",
            slug: "priority-consultation",
            description: "A short public description.",
            durationMin: 45,
            active: true
          }
        ]
      }
    });
    expect(update.statusCode).toBe(200);
    expect(update.json<{ slug: string; services: Array<{ slug: string; description: string | null }> }>().slug).toBe(`${organization.slug}-updated`);
    expect(update.json<{ slug: string; services: Array<{ slug: string; description: string | null }> }>().services[0]?.slug).toBe("priority-consultation");

    const publicProfile = await app.inject({
      method: "GET",
      url: `/api/public/organizations/${organization.slug}-updated`
    });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json<{ services: Array<{ slug: string }> }>().services[0]?.slug).toBe("priority-consultation");

    const duplicateSlug = await app.inject({
      method: "PATCH",
      url: "/api/organization/profile",
      headers,
      payload: {
        name: "Updated Integration Org",
        slug: competing.organization.slug,
        timezone: "UTC",
        services: [
          {
            id: service.id,
            name: "Priority Consultation",
            slug: "priority-consultation",
            durationMin: 45,
            active: true
          }
        ]
      }
    });
    expect(duplicateSlug.statusCode).toBe(409);
    expect(duplicateSlug.json().error.code).toBe("ORGANIZATION_SLUG_TAKEN");

    const audit = await prisma.auditLog.findMany({ where: { organizationId: organization.id, action: "organization.profile_updated" } });
    expect(audit).toHaveLength(1);
  });

  it("prevents overlapping bookings for the same organization", async () => {
    const { organization, user } = await seedTestData();
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const leadResponse = await app.inject({
      method: "POST",
      url: "/api/leads",
      payload: {
        customer: { name: "Booking Customer", email: "booking@example.com" },
        serviceSlug: "consultation",
        message: "I need a consultation next Tuesday morning.",
        preferredDate: "2026-05-05",
        preferredTime: "10:00"
      }
    });
    const lead = leadResponse.json<{ id: string }>();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: "password-123" }
    });
    const cookie = login.headers["set-cookie"];
    const headers = { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" };
    const slot = "2026-05-05T10:00:00.000Z";

    const first = await app.inject({
      method: "POST",
      url: `/api/leads/${lead.id}/bookings`,
      headers,
      payload: { startsAt: slot, status: "requested" }
    });
    expect(first.statusCode).toBe(201);

    const overlap = await app.inject({
      method: "POST",
      url: `/api/leads/${lead.id}/bookings`,
      headers,
      payload: { startsAt: slot, status: "requested" }
    });

    expect(overlap.statusCode).toBe(409);
    expect(overlap.json().error.code).toBe("BOOKING_CONFLICT");
  });

  it("lets owners add team members and blocks duplicate memberships", async () => {
    const { organization, user } = await seedTestData();
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: "password-123" }
    });
    const cookie = login.headers["set-cookie"];
    const headers = { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" };

    const createMember = await app.inject({
      method: "POST",
      url: "/api/team/members",
      headers,
      payload: {
        name: "Front Desk",
        email: "front-desk@example.com",
        role: "staff"
      }
    });

    expect(createMember.statusCode).toBe(201);
    expect(createMember.json<{ role: string; user: { hasPassword: boolean; passwordHash?: string | null } }>().role).toBe("staff");
    expect(createMember.json<{ role: string; user: { hasPassword: boolean; passwordHash?: string | null } }>().user.hasPassword).toBe(false);
    expect(createMember.json<{ role: string; user: { hasPassword: boolean; passwordHash?: string | null } }>().user.passwordHash).toBeUndefined();

    const inviteNotification = await prisma.notification.findFirst({
      where: {
        organizationId: organization.id,
        type: "team_invite_created",
        recipient: "front-desk@example.com"
      }
    });
    expect(inviteNotification).toBeTruthy();
    expect(inviteNotification?.status).toBe("pending");
    expect(inviteNotification?.body).toContain("/setup-account?token=");
    expect(inviteNotification?.body).not.toContain("tokenHash");

    const members = await app.inject({
      method: "GET",
      url: "/api/team/members",
      headers
    });
    expect(members.statusCode).toBe(200);
    expect(members.json<Array<{ user: { email: string } }>>().some((member) => member.user.email === "front-desk@example.com")).toBe(true);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/team/members",
      headers,
      payload: {
        name: "Front Desk",
        email: "front-desk@example.com",
        role: "viewer"
      }
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe("TEAM_MEMBER_EXISTS");
  });

  it("prevents non-owners from managing team members", async () => {
    const { organization } = await seedTestData();
    const viewer = await prisma.user.create({
      data: {
        email: `viewer-${organization.slug}@example.com`,
        name: "Integration Viewer",
        passwordHash: await bcrypt.hash("password-123", 4),
        memberships: {
          create: {
            organizationId: organization.id,
            role: "viewer"
          }
        }
      }
    });
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: viewer.email, password: "password-123" }
    });
    const cookie = login.headers["set-cookie"];
    const headers = { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" };

    const response = await app.inject({
      method: "POST",
      url: "/api/team/members",
      headers,
      payload: {
        name: "Unauthorized Staff",
        email: "unauthorized-staff@example.com",
        role: "staff"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN");
  });

  it("issues a password setup link and lets the invited member activate login", async () => {
    const { organization, user } = await seedTestData();
    const inviteeEmail = `invitee-${organization.slug}@example.com`;
    app = await buildApp({ ...config, DEMO_ORGANIZATION_ID: organization.id }, prisma);
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: "password-123" }
    });
    const cookie = login.headers["set-cookie"];
    const headers = { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie ?? "" };

    const createMember = await app.inject({
      method: "POST",
      url: "/api/team/members",
      headers,
      payload: {
        name: "Invitee",
        email: inviteeEmail,
        role: "viewer"
      }
    });

    expect(createMember.statusCode).toBe(201);
    const created = createMember.json<{ setupUrl: string | null }>();
    expect(created.setupUrl).toContain("/setup-account?token=");

    const inviteNotification = await prisma.notification.findFirst({
      where: {
        organizationId: organization.id,
        type: "team_invite_created",
        recipient: inviteeEmail
      }
    });
    expect(inviteNotification).toBeTruthy();
    expect(inviteNotification?.subject).toContain(organization.name);
    expect(inviteNotification?.body).toContain(created.setupUrl);

    const token = new URL(created.setupUrl ?? "http://localhost/setup-account?token=").searchParams.get("token");
    expect(token).toBeTruthy();

    const setup = await app.inject({
      method: "POST",
      url: "/api/auth/password-setup",
      payload: {
        token,
        password: "invitee-password-123"
      }
    });

    expect(setup.statusCode).toBe(200);
    expect(setup.json().ok).toBe(true);

    const relogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: inviteeEmail,
        password: "invitee-password-123"
      }
    });
    expect(relogin.statusCode).toBe(200);

    const reuse = await app.inject({
      method: "POST",
      url: "/api/auth/password-setup",
      payload: {
        token,
        password: "another-password-123"
      }
    });
    expect(reuse.statusCode).toBe(410);
    expect(reuse.json().error.code).toBe("PASSWORD_SETUP_TOKEN_USED");
  });
});
