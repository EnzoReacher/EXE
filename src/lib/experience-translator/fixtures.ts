/** Fictional handoff example; not participant evidence. */
export const goldenIntake = {
  project: "Em làm website bán hàng bằng React trong nhóm 4 người.",
  jd: "Frontend Developer Intern\nRequirements:\n- React\n- JavaScript\n- REST API\n- Git\n- Responsive UI",
};
export const goldenAnswers = {
  contribution: "Mình phụ trách product listing và tìm kiếm. Mình gọi REST API và xử lý lỗi.",
  technology: "React và JavaScript",
  outcome: "Mình đã hoàn thành demo hiển thị danh sách sản phẩm.",
};

/** Exact synthetic reproduction, not a capture of the owner's original wording/JD. */
export const studyTrackIntake = {
  project: "StudyTrack is a fictional coursework task manager.\nI personally implemented task creation, task editing, task deletion, and task filtering by status and priority using React and TypeScript.\nI used Vite and localStorage.\nI completed manual tests of the demo.",
  jd: "Frontend Developer Intern\nRequirements:\n- React\n- TypeScript\n- Build user interfaces from clearly defined requirements",
};

/** Synthetic demo scenarios; local vocabulary only, never metrics or research. */
export const demoScenarios = {
  taskManager: {
    project: "Mình xây dựng ứng dụng quản lý công việc. Mình phụ trách product listing và tìm kiếm bằng React và JavaScript.",
    jd: goldenIntake.jd,
  },
  reactOnly: {
    project: "I implemented product listing and search using React for a fictional task management project.",
    jd: "Frontend Intern requirements: React, REST API integration and automated testing.",
  },
  unsupported: {
    project: "I implemented product listing and search using React for a fictional task management project.",
    jd: "Frontend Developer Intern — fictional requirements: Angular and Figma for exhibition displays.",
  },
};
// Owner-supplied literal regression: keep the two sentences and newline intact.
export const literalStudyTrackIntake = {
  jd: "Frontend Intern\nRequirements:\n- React\n- TypeScript\n- JavaScript\n- HTML and CSS\n- REST API\n- Git\n- Responsive UI",
  project: "I implemented task creation, task editing, task deletion, task filtering by status, and task filtering by priority.\nI used React, TypeScript, Vite, and localStorage.",
};
export const literalStudyTrackWording = "Implemented task creation, task editing, task deletion, task filtering by status and task filtering by priority. Used React and TypeScript.";
