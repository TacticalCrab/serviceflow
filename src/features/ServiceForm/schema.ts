import * as z from "zod";

const checkInSchema = z.object({
    method: z.enum(["clientDropOff", "servicePickup"]).optional(),
    date: z.date().optional(),
    timeMode: z.enum(["allDay", "specific", "range"]).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
    timeFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
    timeTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
});

const checkOutSchema = z.object({
    method: z.enum(["clientPickup", "serviceDelivery"]).optional(),
    date: z.date().optional(),
    timeMode: z.enum(["allDay", "specific", "range"]).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
    timeFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
    timeTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Podaj prawidłową godzinę").optional(),
});

const formSchema = z.object({
    requestedCreatedAt: z.date(),
    client: z.object({
        name: z.string().min(1, "Imię jest wymagane"),
        surname: z.string().optional(),
        phone: z.string().optional(),
        email: z.email("Nieprawidłowy adres email").optional(),
        address: z.string().optional(),
        note: z.string().optional(),
        preferences: z.object({
            checkIn: checkInSchema.optional(),
            checkOut: checkOutSchema.optional(),
            repairCard: z.boolean().optional(),
            invoice: z.boolean().optional(),
        }).optional(),
    }),
    device: z.object({
        name: z.string().min(1, "Nazwa jest wymagana"),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        defect: z.string().optional(),
    }),
    repairTime: z.string().optional(),
    repairSteps: z.array(z.string()).optional(),
    additionalCosts: z.array(z.object({
        description: z.string().min(1, "Opis jest wymagany"),
        price: z.number().min(0, "Cena musi być większa lub równa 0"),
    })).optional(),
    costEstimate: z.number().min(0, "Koszt musi być większy lub równy 0").optional(),
    note: z.string().optional(),
});

export type FormSchema = z.infer<typeof formSchema>;
export const schema = formSchema;
