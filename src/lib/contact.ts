/** Contato oficial ProEduca: WhatsApp e e-mail (sem ligação telefónica directa pelo número). */
export const PROEDUCA_CONTACT = {
  phoneDisplay: "+55 0800 260 2626",
  /** Dígitos para wa.me (sem espaços). */
  phoneE164Digits: "558002602626",
  email: "contato@proeduka.com.br",
} as const;

export const whatsappSupportHref = `https://wa.me/${PROEDUCA_CONTACT.phoneE164Digits}`;
export const mailtoSupportHref = `mailto:${PROEDUCA_CONTACT.email}`;
