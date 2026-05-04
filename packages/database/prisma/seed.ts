import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "demo-studio" },
    update: {},
    create: {
      name: "Demo Studio",
      slug: "demo-studio",
      timezone: "Europe/Minsk"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "owner@demo.leadpilot.local" },
    update: {},
    create: {
      email: "owner@demo.leadpilot.local",
      name: "Demo Owner"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: { role: "owner" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner"
    }
  });

  const services = await Promise.all(
    [
      { name: "Consultation", slug: "consultation", durationMin: 45 },
      { name: "Haircut", slug: "haircut", durationMin: 60 },
      { name: "Event Photography", slug: "event-photography", durationMin: 120 }
    ].map((service) =>
      prisma.service.upsert({
        where: {
          organizationId_slug: {
            organizationId: organization.id,
            slug: service.slug
          }
        },
        update: service,
        create: {
          organizationId: organization.id,
          ...service
        }
      })
    )
  );

  const seedLeads = [
    {
      customer: { name: "Alex Carter", email: "alex@example.com", phone: "+1555010101" },
      serviceSlug: "haircut",
      message: "I need a haircut this week, preferably Friday evening after work.",
      quality: "warm" as const,
      urgency: "this_week" as const,
      summary: "Customer wants a haircut this week and has a preferred Friday evening slot.",
      nextAction: "Offer two Friday evening appointment times."
    },
    {
      customer: { name: "Maya Chen", email: "maya@example.com", phone: null },
      serviceSlug: "event-photography",
      message: "We are planning a small company event next month and need photography pricing.",
      quality: "hot" as const,
      urgency: "this_month" as const,
      summary: "Customer is planning an event next month and asks for photography pricing.",
      nextAction: "Send event package pricing and request event date and guest count."
    },
    {
      customer: { name: "Sam Rivera", email: null, phone: "+1555020202" },
      serviceSlug: "consultation",
      message: "I am comparing options and may need a consultation later this month.",
      quality: "cold" as const,
      urgency: "flexible" as const,
      summary: "Customer is browsing options and may want a consultation later.",
      nextAction: "Ask what outcome they want and offer a low-commitment intro call."
    }
  ];

  for (const item of seedLeads) {
    const service = services.find((candidate) => candidate.slug === item.serviceSlug);
    const customer = await prisma.customer.create({
      data: {
        organizationId: organization.id,
        ...item.customer
      }
    });

    const lead = await prisma.lead.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        serviceId: service?.id,
        status: item.quality === "cold" ? "new" : "qualified",
        quality: item.quality,
        messages: {
          create: {
            body: item.message
          }
        }
      }
    });

    await prisma.leadAiAnalysis.create({
      data: {
        leadId: lead.id,
        provider: "seed",
        intent: "book_service",
        service: service?.name ?? "consultation",
        urgency: item.urgency,
        budget: "unknown",
        leadQuality: item.quality,
        missingFields: item.customer.phone ? [] : ["phone"],
        summary: item.summary,
        nextAction: item.nextAction,
        confidence: 0.82
      }
    });
  }

  console.log(`Seeded ${organization.name} (${organization.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
