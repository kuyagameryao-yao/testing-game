/* =========================================================
   HELPERS
   ========================================================= */

const $ = s => document.querySelector(s);

const r = (a, b) =>
  a + Math.random() * (b - a);


/* =========================================================
   COLOR PALETTE
   ========================================================= */

const COLORS = [
  '#F3620F',
  '#FFC20A',
  '#67944B',
  '#078D8C',
  '#DA0D1E'
];


/* =========================================================
   BACKGROUND OBJECTS
   ========================================================= */

const OBJECTS = [

  ['vinyl', 3, 58, 170, 0, 'spin'],

  ['cassette', 76, 6, 120, 0],

  ['chip', 88, 66, 70, 0, 'h'],

  ['book', 44, 78, 80, 0, 'h'],


  ['handheld', 10, 10, 80, 1],

  ['pad', 80, 36, 110, 1],

  ['pc', 72, 74, 100, 1],

  ['vinyl', 30, 86, 70, 1, 'spin h'],

  ['cassette', 3, 36, 90, 1, 'h'],

  ['chip', 46, 4, 60, 1],

  ['px', 20, 50, 26, 1, 'blink'],

  ['px', 92, 22, 22, 1, 'blink h'],

  ['px', 60, 90, 20, 1, 'blink']

];


const layers = [
  ...document.querySelectorAll('.layer')
];

const NS = 'http://www.w3.org/2000/svg';


/* =========================================================
   CREATE BACKGROUND OBJECTS
   ========================================================= */

OBJECTS.forEach(
  ([id, x, y, w, l, cls = '']) => {

    const svg =
      document.createElementNS(NS, 'svg');

    const use =
      document.createElementNS(NS, 'use');


    use.setAttribute(
      'href',
      '#' + id
    );


    svg.appendChild(use);


    svg.setAttribute(
      'class',
      'obj ' + cls
    );


    svg.style.cssText = `

      --x:${x}%;

      --y:${y}%;

      --w:${w}px;

      --d:${r(22, 40)}s;

      --dx:${r(-40, 40)}px;

      --dy:${r(-50, 50)}px;

      --t:${r(6, 14)}deg;

      animation-delay:
      ${-r(0, 30)}s,
      ${-r(0, 30)}s;

    `;


    /* Random color for pixel objects */

    if (id === 'px') {

      svg.style.color =
        COLORS[
          Math.floor(r(0, 5))
        ];

    }


    layers[l].appendChild(svg);

  }
);


/* =========================================================
   FLOATING PARTICLES
   ========================================================= */

const dust = $('#dust');


for (let i = 0; i < 26; i++) {

  const p =
    document.createElement('span');


  p.style.cssText = `

    --l:${r(0, 100)}%;

    --s:${r(4, 9)}px;

    --c:${COLORS[i % 5]};

    --d:${r(14, 30)}s;

    --dl:${-r(0, 30)}s;

    --sx:${r(-60, 60)}px;

  `;


  dust.appendChild(p);

}


/* =========================================================
   MOUSE PARALLAX
   ========================================================= */

let tx = 0;
let ty = 0;

let cx = 0;
let cy = 0;

let running = false;


const still =
  matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;


function follow() {

  cx += (tx - cx) * 0.06;

  cy += (ty - cy) * 0.06;


  layers.forEach(layer => {

    layer.style.transform =
      `translate(
        ${cx * layer.dataset.depth}px,
        ${cy * layer.dataset.depth}px
      )`;

  });


  running =
    Math.abs(tx - cx) +
    Math.abs(ty - cy) > 0.05;


  if (running) {

    requestAnimationFrame(follow);

  }

}


addEventListener(
  'pointermove',
  e => {

    if (still) return;


    tx =
      (e.clientX / innerWidth - 0.5)
      * -30;


    ty =
      (e.clientY / innerHeight - 0.5)
      * -30;


    if (!running) {

      running = true;

      requestAnimationFrame(follow);

    }

  }
);


/* =========================================================
   ERROR HANDLING
   ========================================================= */

function setErr(field, errId, msg) {

  $(errId).textContent =
    msg ? '\u26A0 ' + msg : '';


  field.classList.toggle(
    'invalid',
    !!msg
  );


  const control =
    field.querySelector(
      'input,.sel-btn'
    );


  if (control) {

    control.setAttribute(
      'aria-invalid',
      !!msg
    );

  }

}


/* =========================================================
   GRADE DROPDOWN
   ========================================================= */

const gradeBox =
  $('#grade');

const gradeBtn =
  $('#gradeBtn');

const opts =
  [...$('#gradeList').children];


let grade = '';

let act = 0;


const isOpen = () =>
  gradeBox.classList.contains('open');


/* ---------------------------------------------------------
   Active option
   --------------------------------------------------------- */

function setAct(i) {

  act =
    (i + opts.length)
    % opts.length;


  opts.forEach(
    (o, k) => {

      o.classList.toggle(
        'act',
        k === act
      );

    }
  );


  gradeBtn.setAttribute(
    'aria-activedescendant',
    opts[act].id
  );

}


/* ---------------------------------------------------------
   Open dropdown
   --------------------------------------------------------- */

function openList() {

  gradeBox.classList.add('open');

  gradeBtn.setAttribute(
    'aria-expanded',
    'true'
  );


  setAct(
    Math.max(
      0,
      opts.findIndex(
        o => o.dataset.v === grade
      )
    )
  );

}


/* ---------------------------------------------------------
   Close dropdown
   --------------------------------------------------------- */

function closeList() {

  gradeBox.classList.remove(
    'open'
  );


  gradeBtn.setAttribute(
    'aria-expanded',
    'false'
  );


  gradeBtn.removeAttribute(
    'aria-activedescendant'
  );

}


/* ---------------------------------------------------------
   Select grade
   --------------------------------------------------------- */

function pick(o) {

  grade =
    o.dataset.v;


  $('#gradeVal').textContent =
    o.textContent;


  gradeBox.classList.add(
    'has-value'
  );


  opts.forEach(
    x => x.setAttribute(
      'aria-selected',
      x === o
    )
  );


  setErr(
    gradeBox,
    '#gradeErr',
    ''
  );


  closeList();


  gradeBtn.focus();

}


/* ---------------------------------------------------------
   Dropdown click
   --------------------------------------------------------- */

gradeBtn.onclick = () => {

  isOpen()
    ? closeList()
    : openList();

};


/* ---------------------------------------------------------
   Dropdown keyboard
   --------------------------------------------------------- */

gradeBtn.onkeydown = e => {

  if (
    e.key === 'ArrowDown' ||
    e.key === 'ArrowUp'
  ) {

    e.preventDefault();


    if (isOpen()) {

      setAct(
        act +
        (
          e.key === 'ArrowDown'
            ? 1
            : -1
        )
      );

    } else {

      openList();

    }

  }


  else if (
    e.key === 'Enter' ||
    e.key === ' '
  ) {

    e.preventDefault();


    if (isOpen()) {

      pick(
        opts[act]
      );

    } else {

      openList();

    }

  }


  else if (
    e.key === 'Escape' ||
    e.key === 'Tab'
  ) {

    closeList();

  }

};


/* ---------------------------------------------------------
   Click an option
   --------------------------------------------------------- */

opts.forEach(
  o => {

    o.onclick = () => {

      pick(o);

    };

  }
);


/* ---------------------------------------------------------
   Close dropdown outside
   --------------------------------------------------------- */

document.addEventListener(
  'click',
  e => {

    if (
      !gradeBox.contains(e.target)
    ) {

      closeList();

    }

  }
);


/* =========================================================
   LOGIN FLOW
   ========================================================= */

const form =
  $('#form');

const nameIn =
  $('#name');

const nameField =
  $('#nameField');

const btn =
  $('#loginBtn');

const ok =
  $('#success');


/* ---------------------------------------------------------
   Clear name error while typing
   --------------------------------------------------------- */

nameIn.addEventListener(
  'input',
  () => {

    setErr(
      nameField,
      '#nameErr',
      ''
    );

  }
);


/* =========================================================
   LOGIN SUBMIT
   ========================================================= */

form.addEventListener(
  'submit',
  e => {

    e.preventDefault();


    /* -----------------------------------------------
       Get user information
       ----------------------------------------------- */

    const name =
      nameIn.value
        .trim()
        .replace(/\s+/g, ' ');


    /* -----------------------------------------------
       Validate name
       ----------------------------------------------- */

    setErr(
      nameField,
      '#nameErr',

      name.length < 2
        ? 'Enter your name (at least 2 letters).'
        : ''
    );


    /* -----------------------------------------------
       Validate grade
       ----------------------------------------------- */

    setErr(
      gradeBox,
      '#gradeErr',

      grade
        ? ''
        : 'Choose your grade level.'
    );


    /* -----------------------------------------------
       Stop if invalid
       ----------------------------------------------- */

    if (
      name.length < 2 ||
      !grade
    ) {

      form.classList.remove(
        'shake'
      );


      void form.offsetWidth;


      form.classList.add(
        'shake'
      );


      (
        name.length < 2
          ? nameIn
          : gradeBtn
      ).focus();


      return;

    }


    /* -----------------------------------------------
       Start loading animation
       ----------------------------------------------- */

    btn.classList.add(
      'loading'
    );


    btn.disabled = true;


    btn.setAttribute(
      'aria-busy',
      'true'
    );


    /* -----------------------------------------------
       Save user information
       ----------------------------------------------- */

    localStorage.setItem(
      'studentName',
      name
    );


    localStorage.setItem(
      'studentGrade',
      grade
    );


    /* -----------------------------------------------
       Fake login delay
       ----------------------------------------------- */

    setTimeout(
      () => {

        /* Hide login form */

        form.hidden = true;


        /* Show welcome message */

        $('#wName').textContent =
          `Welcome, ${name}!`;


        $('#wGrade').textContent =
          `Grade ${grade} — Ready to learn?`;


        ok.hidden = false;


        ok.focus();


        /* Confetti */

        burst();


        /* -------------------------------------------
           OPEN GAME.HTML
           
           Wait 1.8 seconds so the user can see
           the success animation first.
           ------------------------------------------- */

        setTimeout(
          () => {

            window.location.href =
              'game.html';

          },
          1800
        );

      },
      1500
    );

  }
);


/* =========================================================
   PIXEL CONFETTI
   ========================================================= */

function burst() {

  for (let i = 0; i < 24; i++) {

    const c =
      document.createElement('i');


    const a =
      r(0, 6.28);


    const d =
      r(90, 230);


    c.className =
      'confetti';


    c.style.cssText = `

      background:
      ${COLORS[i % 5]};

      --cx:
      ${Math.cos(a) * d}px;

      --cy:
      ${Math.sin(a) * d}px;

    `;


    $('#card').appendChild(c);


    setTimeout(
      () => c.remove(),
      1300
    );

  }

}


/* =========================================================
   SWITCH USER
   ========================================================= */

$('#again').onclick = () => {

  /* Reset form */

  form.reset();


  /* Reset grade */

  grade = '';


  $('#gradeVal').textContent =
    '';


  gradeBox.classList.remove(
    'has-value'
  );


  opts.forEach(
    o =>
      o.removeAttribute(
        'aria-selected'
      )
  );


  /* Reset login button */

  btn.classList.remove(
    'loading'
  );


  btn.disabled = false;


  btn.removeAttribute(
    'aria-busy'
  );


  /* Hide success */

  ok.hidden = true;


  /* Show form */

  form.hidden = false;


  /* Focus name */

  nameIn.focus();

};


/* =========================================================
   OPTIONAL: CHECK IF GAME PAGE RETURNS TO LOGIN
   ========================================================= */

/*
   Your game.html can access the saved information:

   localStorage.getItem('studentName')
   localStorage.getItem('studentGrade')

   Example:

   const name = localStorage.getItem('studentName');
   const grade = localStorage.getItem('studentGrade');

*/


/* =========================================================
   PAGE LOAD
   ========================================================= */

window.addEventListener(
  'DOMContentLoaded',
  () => {

    nameIn.focus();

  }
);