/** Contato oficial ProEduca: WhatsApp e e-mail (sem ligação telefónica directa pelo número). */
export const PROEDUCA_CONTACT = {
  phoneDisplay: "+55 800 777 2026",
  /** Dígitos para wa.me (sem espaços). */
  phoneE164Digits: "558007772026",
  email: "contato@proeduka.com.br",
} as const;

export const whatsappSupportHref = `https://wa.me/${PROEDUCA_CONTACT.phoneE164Digits}`;
export const mailtoSupportHref = `mailto:${PROEDUCA_CONTACT.email}`;
