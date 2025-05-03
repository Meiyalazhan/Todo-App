const inputBox = document.getElementById("input-box");

function addtask() {
  const inputBox = document.getElementById("input-box");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");

  const taskInput = inputBox.value;
  const date = dateInput.value;
  const time = timeInput.value;

  if (!taskInput || !date || !time) {
    [inputBox, dateInput, timeInput].forEach((input) => {
      input.style.border = input.value ? "3px solid green" : "3px solid red";
      showAlert(`Input Field is empty`, "error");
    });
    return;
  }

  // Format and combine date and time
  const taskDateTime = new Date(`${date}T${time}`);

  const formattedTime = taskDateTime.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDateTime = `${date} ${formattedTime}`;

  const newList = {
    idTime: formattedDateTime.toString(),
    task: taskInput,
    completed: false,
  };

  let docId = taskInput
    .trim()
    .toLowerCase()
    .replace(/[\/.#$\[\]]+/g, "-");

  if (!docId) {
    docId = "task-" + Date.now();
  }

  setTask(newList, docId);
  updateList(taskInput, taskDateTime, formattedDateTime, docId);
  showAlert("Task added successfully.", "success");

  document.getElementById("input-box").value = "";
  document.getElementById("date").value = "";
  document.getElementById("time").value = "";
  [inputBox, dateInput, timeInput].forEach((input) => {
    input.style.border = "";
  });
}

function updateList(
  taskInput,
  taskDateTime,
  formattedDateTime,
  docId,
  isCompleted = false
) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.dataset.id = docId;

  const div = document.createElement("div");
  div.className = "task-content";
  if (isCompleted) {
    div.classList.add("completed");
    li.classList.add("checked");
  }

  const task = document.createElement("span");
  task.className = "task-title";
  task.innerText = taskInput;
  li.onclick = () => toggleTask(task);

  const time = document.createElement("span");
  time.className = "task-time";
  time.innerText = formattedDateTime;

  const timeRemain = document.createElement("span");
  timeRemain.className = "time-remaining";

  // Function to update remaining time
  const intervalId = setInterval(updateRemainingTime, 60000);
  function updateRemainingTime() {
    const now = new Date();
    let diff = taskDateTime - now;

    if (diff <= 0) {
      timeRemain.innerText = "Time's up!";
      time.style.color = "Red";
      clearInterval(intervalId);
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timeRemain.innerText = `Remaining: ${days}d ${hours}h ${minutes}m`;
      console.log("Time Updated", timeRemain.innerText);
    }
  }
  updateRemainingTime();

  div.append(task, time);
  li.append(div, timeRemain);

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";

  closeBtn.onclick = (event) => {
    event.stopPropagation();
    const modal = document.getElementById("confirmModal");
    const confirmYes = document.getElementById("confirmYes");
    const confirmNo = document.getElementById("confirmNo");
    modal.style.display = "block";
    confirmYes.onclick = () => {
      modal.style.display = "none";
      removeTask(closeBtn);
    };
    confirmNo.onclick = () => {
      modal.style.display = "none";
    };
  };

  closeBtn.innerText = "\u00d7";
  closeBtn.setAttribute("role", "button");
  closeBtn.setAttribute("aria-label", "Delete task");

  li.appendChild(closeBtn);

  document.querySelector("ul").appendChild(li);

  boderUL();
}

async function removeTask(btn) {
  const { collection, doc, deleteDoc } = window.firestoreTools;
  const li = btn.closest("li");
  const docId = li.dataset.id;
  try {
    await deleteDoc(doc(collection(db, "todoList"), docId));
    li.classList.add("removed");
    setTimeout(() => {
      li.remove();
      boderUL();
    }, 300);
    showAlert("Task deleted successfully.", "success");
  } catch (error) {
    console.error("Error deleting task:", error);
    showAlert("Failed to delete task.", "error");
  }
}

async function toggleTask(task) {
  const { collection, doc, updateDoc } = window.firestoreTools;
  const li = task.closest("li");
  const div = task.closest("div");
  const docId = li.dataset.id;

  const isCompleted = div.classList.contains("completed");
  try {
    await updateDoc(doc(collection(db, "todoList"), docId), {
      completed: !isCompleted,
    });
    li.classList.toggle("checked");
    div.classList.toggle("completed");
    showAlert(
      `Task ${docId} marked as ${!isCompleted ? "completed" : "incomplete"}.`,
      "success"
    );
  } catch (error) {
    console.error("Error updating task:", error);
    showAlert("Error updating task.", "error");
  }
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    addtask();
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    inputBox.focus();
  }
});

async function setTask(taskObj, docId) {
  const { collection, doc, setDoc } = window.firestoreTools;
  try {
    await setDoc(doc(collection(db, "todoList"), docId), taskObj);
    console.log("Task saved");
  } catch (error) {
    console.error("Error adding task:", error);
    showAlert("Error adding task.", "error");
  }
}

async function getTask() {
  const { collection, getDocs } = window.firestoreTools;
  try {
    const querySnapshot = await getDocs(collection(db, "todoList"));

    const tasks = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const parsedDateTime = new Date(data.idTime);
      tasks.push({ ...data, id: docSnap.id, parsedDateTime });
    });

    tasks.sort((a, b) => a.parsedDateTime - b.parsedDateTime);

    tasks.forEach((task) => {
      updateList(
        task.task,
        task.parsedDateTime,
        task.idTime,
        task.id,
        task.completed
      );
    });
  } catch (error) {
    console.error("Error getting tasks:", error);
    showAlert("Error getting tasks.", "error");
  }
}

window.onload = getTask;

function boderUL() {
  const ul = document.querySelector("ul");
  ul.classList.toggle("has-tasks", ul.children.length > 0);
}

function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  const container = document.querySelector(".container");
  container.appendChild(alert);
  setTimeout(() => {
    alert.remove();
  }, 2000);
}
