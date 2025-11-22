document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');
    const fileCount = document.getElementById('file-count');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const convertBtn = document.getElementById('convert-btn');
    const spinner = convertBtn.querySelector('.spinner');
    const btnText = convertBtn.querySelector('span');

    let files = [];

    // Initialize Sortable
    new Sortable(fileList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const item = files.splice(evt.oldIndex, 1)[0];
            files.splice(evt.newIndex, 0, item);
        }
    });

    // Drag and Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = dt.files;
        handleFiles(newFiles);
    }

    // Browse Button
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
        this.value = ''; // Reset to allow selecting same files again
    });

    function handleFiles(newFiles) {
        const validFiles = Array.from(newFiles).filter(file =>
            file.type === 'image/png' ||
            file.type === 'image/jpeg' ||
            file.type === 'image/jpg'
        );

        if (validFiles.length === 0 && newFiles.length > 0) {
            alert('Please select only PNG or JPG images.');
            return;
        }

        files = [...files, ...validFiles];
        updateUI();
    }

    function updateUI() {
        fileList.innerHTML = '';
        fileCount.textContent = `(${files.length})`;

        if (files.length > 0) {
            fileListContainer.classList.remove('hidden');
            convertBtn.disabled = false;
        } else {
            fileListContainer.classList.add('hidden');
            convertBtn.disabled = true;
        }

        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';

            // Create thumbnail
            const img = document.createElement('img');
            img.className = 'file-preview';
            img.file = file;

            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);

            const info = document.createElement('div');
            info.className = 'file-info';

            const name = document.createElement('span');
            name.className = 'file-name';
            name.textContent = file.name;

            const size = document.createElement('span');
            size.className = 'file-size';
            size.textContent = formatBytes(file.size);

            info.appendChild(name);
            info.appendChild(size);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            removeBtn.onclick = () => removeFile(index);

            li.appendChild(img);
            li.appendChild(info);
            li.appendChild(removeBtn);
            fileList.appendChild(li);
        });
    }

    function removeFile(index) {
        files.splice(index, 1);
        updateUI();
    }

    clearAllBtn.addEventListener('click', () => {
        files = [];
        updateUI();
    });

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Conversion Logic
    convertBtn.addEventListener('click', async () => {
        if (files.length === 0) return;

        setLoading(true);

        try {
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                let image;

                if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(arrayBuffer);
                } else {
                    image = await pdfDoc.embedJpg(arrayBuffer);
                }

                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            downloadPdf(pdfBytes, 'images.pdf');

        } catch (error) {
            console.error('Conversion failed:', error);
            alert('An error occurred during conversion. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            convertBtn.disabled = true;
            spinner.classList.remove('hidden');
            btnText.textContent = 'Converting...';
        } else {
            convertBtn.disabled = false;
            spinner.classList.add('hidden');
            btnText.textContent = 'Convert to PDF';
        }
    }

    function downloadPdf(bytes, filename) {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
