// Your JS code goes here

const baseURL = window.location.origin;

const BOOK = 'maths';

const SECTION_TYPES = Object.freeze({
  CHAPTER: "chapter",
  LESSON: "lesson"
});

const SECTION_STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  COMPLETE: "COMPLETE",
  IN_PROGRESS: "IN_PROGRESS"
});

/**
 * 
 * @param {HTMLDivElement} parentElement = Element onto which accordian should be created
 * @param {function} accordionTemplate = Accordion Header Template in function format which accepts an object
 * @param {function} accordionItemTemplate = Accordion Section Template in async function format which accepts an object
 * @param {Array<Object>} items = Array of Objects
 */
const accordion = (parentElement, accordionTemplate, accordionItemTemplate, items) => {
  const accordion = document.createElement("div");
  accordion.className = 'accordion';
  const expand = (accordionElement, expand) => {
    accordionElement.setAttribute("accordion-expanded", expand);
    if (expand) {
      accordionElement.classList.remove("accordion-collapsed");
      setTimeout(() => {
        accordionElement.classList.remove("accordion-collapsed-hide");
      }, 10);
      accordionElement.classList.add("accordion-expanded");
    } else {
      accordionElement.classList.remove("accordion-expanded");
      accordionElement.classList.add("accordion-collapsed");
      setTimeout(() => {
        accordionElement.classList.add("accordion-collapsed-hide");
      }, 500);
    }
  }
  for(const item of items) {
    const templateString = accordionTemplate(item);
    const accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item accordion-collapsed';
    accordionItem.innerHTML = `<div class="accordion-header">${templateString}<span class="arrow-container"><i class="arrow"></i></span></div>`;
    accordionItem.setAttribute('accordion-expanded', "false");
    accordionItem.setAttribute('data-loaded', "false");
    
    accordionItem.onclick = async (e) => {
      const isExpanded = accordionItem.getAttribute('accordion-expanded') === "true";
      expand(accordionItem, !isExpanded);
      if (accordionItem.getAttribute("data-loaded") === "false") {
        accordionItem.setAttribute("data-loaded", "true");
        const accordionSection = document.createElement("div");
        accordionSection.className = "accordion-section";
        accordionItem.appendChild(accordionSection);
        accordionSection.innerHTML = "<div class='accordion-loader'></div>";
        accordionSection.innerHTML = await accordionItemTemplate(item);
      }
    }
    accordion.appendChild(accordionItem);
  }

  parentElement.appendChild(accordion);
}

/**
 * 
 * @param {string} bookName - Book Name 
 */
const loadBook = async (bookName) => {
  const response = await fetch(`${baseURL}/api/book/${bookName}`);
  const data = await response.json();
  const bookList = data.response.sort((a,b) => a.sequenceNO - b.sequenceNO);
  return bookList;
}

/**
 * @return a memoized function which accepts bookName and sectionId  
 */
const loadSectionMemoized = () => {
  const sectionMap = {};
  return async (bookName, sectionId) => {
    if (sectionMap[sectionId]) {
      return sectionMap[sectionId];
    }
    const response = await fetch(`${baseURL}/api/book/${bookName}/section/${sectionId}`);
    const data = await response.json();
    const lessonList = data.response[sectionId].sort((a,b) => a.sequenceNO - b.sequenceNO);
    sectionMap[sectionId] = lessonList;
    return lessonList;
  }
}

/**
 * function which accepts bookName and sectionId
 * @param {string} bookName
 * @param {string} sectionId
 */
const getSection = loadSectionMemoized();

/**
 * 
 * @param {Number} completed = items completed
 * @param {Number} total = total items 
 */
const ProgressBar = (completed, total) => {
  const remaining = Math.floor((total - completed)/total * 100);
  const completedPercent = 100 - remaining;
  return `<div class='list-progress-container'>
    <div class="progress-filler" style="width: ${completedPercent}%">
    </div>
    <span class='progress-label'>${completed}/${total}</span>
  </div>`;
}

/**
 * Load Book and render it into 'chapters' HTMLDivElement
 */
loadBook(BOOK).then(bookList => {
  const accordionTemplate = (section) => {
    return `<div class='chapter'>
        <div class='title'>
            ${section.title}
        </div>
        ${ProgressBar(section.completeCount, section.childrenCount)}
    </div>`;
  };
  const getStatus = (lesson) => {
    switch(lesson.status) {
      case SECTION_STATUS.COMPLETE:
        return `<img src="/assets/icons/check.png" alt="" />`;
      case SECTION_STATUS.IN_PROGRESS:
        return `<img src="/assets/icons/in-progress.png" alt="" />`;
      default:
        return `<img src="/assets/icons/circle.png" alt="" />`;
    }
  }
  const accordionItemTemplate = async (section) => {
    const lessons = await getSection(BOOK, section.id); 
    return `
        <div class='lessons'>
            ${lessons.map((lesson, i) => `<div class='lesson'>
              <div class='progress'>${getStatus(lesson)}</div>
              ${i !== (lessons.length - 1) ? '<span class="progress-line"></span>' : ''} 
              <div class='title'>${lesson.title}</div>
            </div>`).join('')}
        </div>
    `;
  }
  accordion(document.getElementById('chapters'), 
    accordionTemplate, 
    accordionItemTemplate, 
    bookList.filter(book => book.type === SECTION_TYPES.CHAPTER));
});