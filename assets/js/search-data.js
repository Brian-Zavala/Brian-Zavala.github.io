// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-self-assessment",
          title: "self-assessment",
          description: "A professional self-assessment introducing my work across the CS-499 Capstone and how it prepares me for a full-stack web developer role.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/self-assessment/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "Enhanced artifacts demonstrating growth across three computer science categories: software design and engineering, algorithms and data structures, and databases.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "projects-code-review",
          title: 'Code Review',
          description: "A walkthrough of the existing Travlr Getaways codebase and the planned enhancements across software design, algorithms and data structures, and databases.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_code_review/";
            },},{id: "projects-software-design-and-engineering",
          title: 'Software Design and Engineering',
          description: "Six enhancements to the Travlr Getaways MEAN-stack application that tighten the boundary between the public site, the admin SPA, and the API: a functional HttpInterceptor, environment-based Angular configuration, real user-facing error feedback, hardened CORS, and the removal of a deprecated HTTP client.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_software_design/";
            },},{id: "projects-algorithms-and-data-structures",
          title: 'Algorithms and Data Structures',
          description: "Five enhancements to the Travlr Getaways application that move work off the database and into the right data shapes: server-side pagination, an indexed single-document lookup, a price-field type migration from string to number, a BehaviorSubject-backed cache in the Angular admin, and a hardened JWT decode path.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_algorithms/";
            },},{id: "projects-databases",
          title: 'Databases',
          description: "Six enhancements to the Travlr Getaways data and authentication layer: a redesigned user schema, a migration from PBKDF2 to bcrypt, refresh tokens on a separate signing secret, a startup configuration validator, server-side input validation, and an API specification a new developer can actually read.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_databases/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%71%75%61%64%66%61%74%68%65%72%32%32@%68%6F%74%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/Brian-Zavala", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
