const asset = (name: string) => `/motion-nova/${name}`;


export const landingFrames = [
  { id: "frame-01", label: "Початок" },
  { id: "frame-02", label: "Ідея" },
  { id: "frame-03", label: "Простір" },
  { id: "frame-04", label: "Формати" },
  { id: "frame-05", label: "Локації" },
  { id: "frame-06", label: "Ритм" },
  { id: "frame-07", label: "Старт" }
] as const;

export const spaces = [
  { id: "space-01", title: "Тренувальний простір", image: asset("frame-03-1.png") },
  { id: "space-02", title: "Функціональна зона", image: asset("frame-03-2.png") },
  { id: "space-03", title: "Recovery-зона", image: asset("frame-03-3.png") }
] as const;

export const formats = [
  {
    id: "strength",
    title: "Strength",
    description: "Сила як фундамент. Контрольоване навантаження, яке поступово формує базу.",
    image: asset("frame-04-1.png"),
    position: "70% 52%",
    point: { x: "71.8%", y: "12.3%" }
  },
  {
    id: "functional",
    title: "Functional",
    description: "Координація, витривалість і рухливість у функціональному тренуванні.",
    image: asset("frame-04-2.png"),
    position: "45% 52%",
    point: { x: "92.1%", y: "38.7%" }
  },
  {
    id: "cardio",
    title: "Cardio",
    description: "Темп, який підлаштовується під твою дистанцію та твій ритм.",
    image: asset("frame-04-3.png"),
    position: "78% 50%",
    point: { x: "87.7%", y: "71.8%" }
  },
  {
    id: "mobility",
    title: "Mobility",
    description: "Рухливість без поспіху: стабільність, амплітуда та контроль.",
    image: asset("frame-04-4.png"),
    position: "63% 52%",
    point: { x: "53.8%", y: "93.4%" }
  },
  {
    id: "recovery",
    title: "Recovery",
    description: "Відновлення як частина системи, а не пауза між тренуваннями.",
    image: asset("frame-04-5.png"),
    position: "64% 54%",
    point: { x: "12.3%", y: "71.8%" }
  }
] as const;

export const locations = [
  {
    id: "center",
    title: "Motion Nova Center",
    shortTitle: "Center",
    address: "вул. Соборності, 40, Полтава",
    coords: { lat: 49.5891, lng: 34.5447 },
    note: "Центральний клуб із повним набором тренувальних форматів і recovery-зоною.",
    image: asset("frame-05-1.png"),
    point: { x: "48.5%", y: "53%" },
    pointMobile: { x: "42%", y: "56%" }
  },
  {
    id: "podil",
    title: "Motion Nova Поділ",
    shortTitle: "Поділ",
    address: "Панянський узвіз, 12, Полтава",
    coords: { lat: 49.6012, lng: 34.5361 },
    note: "Стриманий силовий простір із функціональною зоною та вільною вагою.",
    image: asset("frame-05-2.png"),
    point: { x: "69.4%", y: "34.7%" },
    pointMobile: { x: "68%", y: "47%" }
  }
] as const;

export const rhythmItems = [
  {
    id: "trainer",
    code: "01",
    title: "Тренер",
    note: "Персональний супровід і план, що працює.",
    image: asset("frame-06-1.png"),
    point: { x: "43%", y: "10.5%" }
  },
  {
    id: "web-app",
    code: "02",
    title: "Web app",
    note: "Записи, контроль, аналітика і твій прогрес.",
    image: asset("frame-06-2.png"),
    point: { x: "18.5%", y: "59%" }
  },
  {
    id: "recovery",
    code: "03",
    title: "Recovery",
    note: "Відновлення як частина плану.",
    image: asset("frame-06-3.png"),
    point: { x: "50.5%", y: "81%" }
  },
  {
    id: "club-service",
    code: "04",
    title: "Club service",
    note: "Підтримка у потрібний момент.",
    image: asset("frame-06-4.png"),
    point: { x: "78%", y: "37.5%" }
  }
] as const;

export const contacts = [
  { id: "phone", label: "Телефон", value: "+38 (0532) 50-12-40", href: "tel:+380532501240" },
  { id: "email", label: "Пошта", value: "hello@motion-nova.club", href: "mailto:hello@motion-nova.club" }
] as const;

export const marketingAssets = {
  logoWhite: asset("logo-white-transparent.png"),
  logoBlack: asset("logo-black-transparent.png"),
  hero: asset("frame-01.png"),
  rhythmMain: asset("frame-06-main.png")
} as const;
