import { PRIVACY_CONTACT, SITE_URL } from '@/constants/privacy';

import type { Dictionary } from '../types';

/** Traducción de referencia del aviso (spec 12): la versión que vale es la de español. */
export const privacy: Dictionary['privacy'] = {
  title: 'Privacy notice',
  updated: (fecha) => `Last updated: ${fecha}`,
  updatedOn: 'October 5, 2026',
  referenceNote:
    'This is a translation for reference only. KAVI’s privacy notice is issued under Mexican law, and the Spanish version is the one that applies.',
  otherLanguage: 'Leer en español (la versión que vale)',
  intro:
    'At KAVI we take your data seriously. This notice explains, in plain language, what data we use, what for, who it’s shared with and how you can control it. It is issued under Mexico’s Federal Law on the Protection of Personal Data Held by Private Parties (2025).',
  sections: [
    {
      title: '1. Who is responsible for your data',
      blocks: [
        'Areli Soraya Perdue Centeno, with an address for notices at Avenida Del Pedregal 534, colonia Pedregal del Valle, C. P. 66280, San Pedro Garza García, Nuevo León, Mexico, is responsible for processing your personal data in KAVI.',
        `For any privacy matter, write to us at **${PRIVACY_CONTACT}**.`,
      ],
    },
    {
      title: '2. What data we use',
      blocks: [
        '**For your account:** email, username, name and password. The password is stored encrypted by our authentication provider; no one at KAVI can see it.',
        '**To check your age:** your date of birth and the date you accepted this notice. Only you can see it; your contacts can’t. If you are 16 or 17, also the email of your mother, father or guardian and their answer.',
        '**For your profile (optional):** your Nobi or avatar and your birthday.',
        '**For your calendar and lists:** the activities you schedule (title, date, time, theme, description), your themes, reminders, lists, to-dos and notes.',
        '**For sharing:** your contacts in KAVI, who you share your calendar, activities or lists with, the invitations you send and receive, and the colors you assign to each contact.',
        '**For your workouts (wellness data):** sessions, exercises, sets, weights and reps, and whatever you choose to note: body weight, energy level, notes and tags (for example “Pain”), and your training streak with its notes.',
        '**Phone activity, only if you connect it:** steps, distance, active calories and workouts from other apps that your phone or watch already tracks. **This data doesn’t leave your device:** KAVI reads it there to show it to you and doesn’t receive it on its servers.',
        '**Technical data:** your app settings (for example, the weight unit or the time format) are stored on your own device. Our providers may log technical connection data, such as the IP address and date, for security and so the service works.',
        '**What we don’t do:** we don’t use your data for advertising, we don’t sell data, we don’t use third-party analytics or tracking tools, and we don’t send you marketing.',
      ],
    },
    {
      title: 'Sensitive personal data',
      blocks: [
        'Some workout data, such as body weight or a pain note, and phone activity may reveal information about your health. The law considers it **sensitive personal data**. We only process it to show it to you and to make the calculations you see in the app, and **only with your express consent**: we ask for it the first time you open KAVI, on the “Before you start” screen, and for phone activity, again when you connect it.',
      ],
    },
    {
      title: '3. What we use your data for',
      blocks: [
        'Only to provide the KAVI service:',
        {
          list: [
            'Create and protect your account, and sign you in.',
            'Check the minimum age and, if you are 16 or 17, ask your mother, father or guardian for approval.',
            'Store and sync your calendar, lists and workouts across your devices.',
            'Share with the people you choose what you decide to share.',
            'Schedule your reminders.',
            'Calculate what you see in the app: volume, records, estimated max, streak and achievements.',
            'Keep the service secure and handle your requests.',
          ],
        },
        'We don’t use your data for any other purpose. If we ever wanted to, we would ask your permission first.',
      ],
    },
    {
      title: '4. Who it’s shared with',
      blocks: [
        '**With the people you choose.** If you share your calendar, an activity or a list, those people see what you share, at the level of detail you choose. Your workouts are private and aren’t shared with anyone.',
        '**With providers that help us run KAVI**, who may only use the data to provide their service to us:',
        {
          list: [
            '**Supabase:** database and authentication. The data is stored on servers in the United States.',
            '**Vercel:** hosts the web version of KAVI and sends the approval email to mothers, fathers or guardians, in the United States.',
            '**Google (Gmail):** sends your account verification emails and the approval email to your mother, father or guardian.',
          ],
        },
        'We don’t transfer your data to other people or companies outside these cases, except when a competent authority requires it under the law.',
      ],
    },
    {
      title: '5. Your rights and how to exercise them',
      blocks: [
        'You can **access** your data, **correct** it, **cancel** it or **object** to its processing (ARCO rights), and **revoke your consent**.',
        {
          list: [
            `You can do a lot of this directly in the app: edit your profile, delete activities, lists or workouts, disconnect phone activity (Fitness → Settings → Health data) and delete your account with all your data (Profile → Delete account). If you no longer have access to the app, we explain how to request it at ${SITE_URL}/eliminar-cuenta.`,
            `For everything else, write to **${PRIVACY_CONTACT}** with your username, which right you want to exercise and over what data. We’ll answer within the time limits set by law.`,
          ],
        },
      ],
    },
    {
      title: '6. How long we keep it',
      blocks: [
        'For as long as you have your account. If you delete your account, your data is deleted from the database right away, including your date of birth and the requests to your mother, father or guardian. KAVI doesn’t have scheduled backups today; if they’re ever turned on, this notice will say how long they’re kept. Phone activity is never stored on our servers.',
      ],
    },
    {
      title: '7. How we protect it',
      blocks: [
        'Connections are encrypted (HTTPS); passwords are stored encrypted; and the database enforces rules so each person can only see their own data and what other people shared with them.',
      ],
    },
    {
      title: '8. Minors',
      blocks: [
        'KAVI is meant for people **16 or older**, such as university students. If you are 16 or 17, the law considers you a minor: to use KAVI you need the **consent of your mother, father or guardian**. When you start, we ask for their email and send them a link where they review this notice and approve it or not; until they approve it, the account can’t be used. Your mother, father or guardian can exercise your ARCO rights by writing to the contact email.',
        'If you are under 16, don’t use KAVI or send us personal data. If, when you start, your date of birth shows you are under 16, the account is deleted at that moment; if we find out in another way that an account belongs to someone under 16, we will delete it.',
      ],
    },
    {
      title: '9. Changes to this notice',
      blocks: ['We’ll post any change on this page with its date. If the change is important, we’ll ask you inside the app to accept it again.'],
    },
    {
      title: '10. Authority',
      blocks: [
        'If you believe your right to the protection of personal data has been violated, you can go to the competent authority, which under the 2025 law is the Ministry of Anti-Corruption and Good Government (Secretaría Anticorrupción y Buen Gobierno).',
      ],
    },
  ],
  back: 'Back',
};
