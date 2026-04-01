window.Store = {
  profile: {
    name: "Javier",
    zone: "San Miguel de Abona",
    handicap: "18.4",
    favCourse: "Amarilla Golf",
    photo: "https://i.pravatar.cc/300?img=12"
  },
  matches: [
    {
      id: 1,
      course: "Amarilla Golf",
      date: "2026-04-03",
      time: "16:00",
      level: "HCP 15-25",
      comment: "Partida tranquila",
      players: ["Javier"],
      maxPlayers: 4,
      status: "abierto"
    }
  ],
  statuses: [
    {
      id: 1,
      author: "Carlos",
      text: "Estoy libre esta semana por las mañanas por el sur."
    }
  ],
  players: {
    Javier: {
      name: "Javier",
      zone: "San Miguel de Abona",
      handicap: "18.4",
      favCourse: "Amarilla Golf",
      photo: "https://i.pravatar.cc/300?img=12",
      bio: "Jugador habitual de tardes. Le gusta jugar ritmo tranquilo y cerrar los hoyos con putt corto."
    }
  },
  fields: [
    {
      id: 1,
      name: "Amarilla Golf",
      zone: "San Miguel de Abona",
      holes: 18,
      par: 71,
      designer: "Donald Steel",
      description: "Recorrido junto al mar con hoyos tecnicos y viento como factor clave.",
      image: "https://www.tenerifegolf.com/sites/default/files/styles/gallery_large/public/aaa2.jpg?itok=1YiGyxYN",
      services: ["Driving range", "Buggy", "Pro shop", "Restaurante"],
      phone: "+34 922 73 80 32",
      vacantSlots: ["08:40 · 3 plazas", "10:20 · 2 plazas", "15:10 · 4 plazas"]
    },
    {
      id: 2,
      name: "Golf del Sur",
      zone: "San Miguel de Abona",
      holes: 27,
      par: 72,
      designer: "Pepe Gancedo",
      description: "Calles anchas, bunkers volcanicos y tres recorridos combinables.",
      image: "https://www.tenerifegolf.com/sites/default/files/styles/gallery_large/public/g4.jpg?itok=RlZUOcYk",
      services: ["Academia", "Trolleys", "Practice area", "Club house"],
      phone: "+34 922 73 80 17",
      vacantSlots: ["09:00 · 4 plazas", "12:30 · 1 plaza", "16:00 · 3 plazas"]
    },
    {
      id: 3,
      name: "Golf Costa Adeje",
      zone: "Adeje",
      holes: 27,
      par: 72,
      designer: "Pepe Gancedo",
      description: "Campo premium con vistas al Atlantico y greenes amplios.",
      image: "https://www.golfcostaadeje.com/wp-content/uploads/2023/02/GolfCostaAdeje3.jpg",
      services: ["Putting green", "Spa", "Restaurante", "Alquiler de palos"],
      phone: "+34 922 71 00 00",
      vacantSlots: ["07:50 · 2 plazas", "11:40 · 4 plazas", "14:20 · 2 plazas"]
    },
    {
      id: 4,
      name: "Abama Golf",
      zone: "Guia de Isora",
      holes: 18,
      par: 72,
      designer: "Dave Thomas",
      description: "Recorrido exigente con desnivel y vistas panoramicas al Teide.",
      image: "https://www.abamagolf.com/images/bagallery/original/Galery3.jpg",
      services: ["Caddie master", "Buggy GPS", "Clinics", "Restaurant"],
      phone: "+34 922 12 60 00",
      vacantSlots: ["08:10 · 2 plazas", "10:50 · 3 plazas", "13:30 · 1 plaza"]
    },
    {
      id: 5,
      name: "Buenavista Golf",
      zone: "Buenavista del Norte",
      holes: 18,
      par: 72,
      designer: "Severiano Ballesteros",
      description: "Recorrido costero con hoyos iconicos sobre acantilado.",
      image: "https://www.tenerifegolf.com/sites/default/files/styles/gallery_large/public/buenavista_golf_03.jpg?itok=aGqT3cET",
      services: ["Zona de practicas", "Buggy", "Escuela", "Cafeteria"],
      phone: "+34 922 12 90 80",
      vacantSlots: ["09:30 · 4 plazas", "12:10 · 2 plazas", "15:40 · 3 plazas"]
    },
    {
      id: 6,
      name: "Real Club de Golf de Tenerife",
      zone: "Tacoronte",
      holes: 18,
      par: 71,
      designer: "Mackenzie Ross",
      description: "Campo historico con arbolado y trazado clasico de montaña.",
      image: "https://www.tenerifegolf.com/sites/default/files/styles/gallery_large/public/penon1.jpg?itok=MaqBcoAp",
      services: ["Club social", "Zona de approach", "Tienda", "Restaurante"],
      phone: "+34 922 63 65 11",
      vacantSlots: ["08:20 · 2 plazas", "11:00 · 3 plazas", "16:20 · 4 plazas"]
    }
  ]
};
