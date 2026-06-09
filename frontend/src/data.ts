const AV = ["#2f5d4a", "#c5743c", "#3f6d8c", "#7a5ea8", "#a8546a", "#4a7a5f", "#8a6d3b", "#5a6b7a"];
export const avatarColor = (s: string): string =>
  AV[(s ? s.charCodeAt(0) + s.charCodeAt(s.length - 1) : 0) % AV.length];
export const initials = (n: string): string =>
  (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

interface DataPractice {
  name: string;
  pms: string;
  location: string;
  phone: string;
}

interface DataUser {
  name: string;
  role: string;
}

interface DataConversation {
  id: string;
  name: string;
  channel: string;
  unread: number;
  last: string;
  when: string;
}

interface SmsTemplate {
  name: string;
  body: string;
}

interface DataShape {
  practice: DataPractice;
  user: DataUser;
  conversations: DataConversation[];
  smsTemplates: SmsTemplate[];
}

export const DATA: DataShape = {
  practice: { name: "Bright Smile Dental", pms: "Open Dental", location: "Austin, TX", phone: "(512) 555-0148" },
  user: { name: "Dana Whitfield", role: "Office Manager" },
  conversations: [
    { id: "C1", name: "Marcus Reyes", channel: "sms", unread: 2, last: "Yes tomorrow morning works!", when: "11:51 AM" },
    { id: "C2", name: "Grace Okafor", channel: "sms", unread: 0, last: "Form completed ✓", when: "10:20 AM" },
    { id: "C4", name: "Tom Becker", channel: "sms", unread: 1, last: "What does the crown cost?", when: "Yesterday" },
  ],
  smsTemplates: [
    { name: "Appointment reminder", body: "Hi {{first_name}}, reminding you of your {{appt_type}} on {{date}} at {{time}}. Reply C to confirm." },
    { name: "Send intake form", body: "Hi {{first_name}}! Please complete your intake form before your visit: {{form_link}}" },
    { name: "Missed-call text-back", body: "Sorry we missed your call at {{practice}}! How can we help?" },
  ],
};
