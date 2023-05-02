const dropArea = document.getElementById('drop-area');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

dropArea.addEventListener('click', function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf'; // Only allow PDF files
  input.onchange = function(e) {
    const file = e.target.files[0];
    uploadFile(file);
  };
  input.click();
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight(e) {
  dropArea.classList.add('highlight');
}

function unhighlight(e) {
  dropArea.classList.remove('highlight');
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  handleFiles(files);
}

function handleFiles(files) {
  files = [...files];
  files.forEach(uploadFile);
}

// function uploadFile(file) {
//   const url = URL.createObjectURL(file);
//   const li = document.createElement('li');
//   const link = document.createElement('a');
  
//   link.href = url;
//   link.textContent = file.name;

//   li.appendChild(link);
  
//   const fileList = document.getElementById('file_list');
//   fileList.appendChild(li);
//   console.log("Title of uploaded file: " + file.name);
  
//   // Remove the <p> element if it exists
//   const uploadedFileList = document.getElementById('file_list');
//   const pElement = uploadedFileList.getElementsByTagName('p')[0];
//   if (pElement) {
//     uploadedFileList.removeChild(pElement);
//   }
// }

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = url;
  link.textContent = file.name;

  // Add download attribute to link
  link.setAttribute('download', file.name);

  // Add click event listener to link
  link.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
}

function uploadFile(file) {
  const li = document.createElement('li');

  li.textContent = file.name;

  const fileList = document.getElementById('file_list');
  fileList.appendChild(li);

  console.log("Title of uploaded file: " + file.name);

  // Remove the <p> element if it exists
  const uploadedFileList = document.getElementById('file_list');
  const pElement = uploadedFileList.getElementsByTagName('p')[0];
  if (pElement) {
    uploadedFileList.removeChild(pElement);
  }

  // Add click event listener to li element
  li.addEventListener('click', function(e) {
    downloadFile(file);
  });
}
