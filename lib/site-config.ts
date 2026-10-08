export type CourseFormat = "Online" | "Onsite";

export interface Course {
  title: string;
  summary: string;
  format: CourseFormat;
  badge: string;
  duration?: string;
  enquiryHref: string;
}

const enquiryLink = (course: string) =>
  `/contact?course=${encodeURIComponent(course)}`;

export const siteConfig = {
  instituteName: "Eilm Academy",
  shortName: "EA",
  tagline:
    "Authentic Islamic learning rooted in the Qur’an and Sunnah, with online and onsite programs that nurture understanding, practice, and character.",
  description:
    "Learn the Qur’an and deepen your understanding of Islam through structured programs guided by qualified scholars. Explore online and onsite learning that connects knowledge with worship, character, and everyday life.",
  navigation: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/#courses", label: "Courses" },
    { href: "/donate", label: "Donate" },
    { href: "/contact", label: "Contact" },
  ],
  about: [
    "Eilm Academy is dedicated to making authentic Islamic education accessible through structured online and onsite programs. Rooted in the Qur’an and Sunnah, our approach brings together learning, reflection, and practical application.",
    "Our purpose goes beyond sharing information. We aim to nurture a deeper understanding of faith, commitment to the Sunnah, and good character in everyday life.",
  ],
  aboutUrdu:
    "ایلم اکیڈمی قرآن و سنت پر مبنی خالص اسلامی تعلیم کو منظم آن لائن اور آفس کے پروگراموں کے ذریعے سب کے لیے قابل رسائی بنانے کے لیے وقف ہے۔ ہمارا اندازِ تعلیم علم، غور و فکر اور روزمرہ عمل کو ایک ساتھ جوڑتا ہے۔",
  courses: [
    {
      title: "Fehm e Quran Course",
      summary:
        "Build a deeper understanding of the Qur’an through guided study of its meanings and message. Reflect on its teachings and their relevance to everyday life.",
      format: "Online" as CourseFormat,
      badge: "Online",
      enquiryHref: enquiryLink("Fehm e Quran Course"),
    },
    {
      title: "Dars e Nizami",
      summary:
        "Pursue a structured study of the traditional Islamic sciences under the guidance of qualified scholars, with an emphasis on understanding, discipline, and Islamic character.",
      format: "Onsite" as CourseFormat,
      badge: "Onsite",
      enquiryHref: enquiryLink("Dars e Nizami"),
    },
    {
      title: "2-Year Ilm e Deen Course",
      summary:
        "Strengthen your foundation in Islamic knowledge through a two-year program focused on faith, worship, and applying Islamic teachings in daily life.",
      format: "Onsite" as CourseFormat,
      badge: "Onsite · 2 Years",
      duration: "2 Years",
      enquiryHref: enquiryLink("2-Year Ilm e Deen Course"),
    },
  ],
  venue: {
    name: "Jamia Masjid Al Mahmoud",
    area: "Khanqah Darul Eman Wal Taqwa, Islamabad",
    directionsUrl:
      "https://www.google.com/maps/search/?api=1&query=Jamia%20Masjid%20Al%20Mahmoud%2C%20Khanqah%20Darul%20Eman%20Wal%20Taqwa%2C%20Islamabad",
  },
  contact: {
    phone: "+92 315 5090055",
    phoneHref: "tel:+923155090055",
    email: "Eilmacademy@gmail.com",
    emailHref: "mailto:Eilmacademy@gmail.com",
    address: "Jamia Masjid Al Mahmoud, Khanqah Darul Eman Wal Taqwa, Islamabad",
  },
};
