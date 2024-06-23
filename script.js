document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const clearButton = document.getElementById('clearButton');
    const downloadAllButton = document.getElementById('downloadAllButton');
    const dropZone = document.getElementById('dropZone');
    const resultContainer = document.getElementById('resultContainer');

    function showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.className = 'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50';
        loadingDiv.innerHTML = `
            <div class="bg-gray-800 p-5 rounded-lg">
                <p class="mb-2 text-gray-200">${message}</p>
                <div class="w-full bg-gray-700 rounded-full h-2.5">
                    <div id="progressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    function updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('loadingIndicator');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    clearButton.addEventListener('click', () => {
        fileInput.value = '';
        resultContainer.innerHTML = '';
        downloadAllButton.style.display = 'none';
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        if (files.length > 20) {
            alert('Vous ne pouvez sélectionner que 20 images au maximum.');
            return;
        }

        showLoading('Compression en cours...');
        let processedFiles = 0;
        let totalFiles = files.length;

        Array.from(files).forEach((file, index) => {
            if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
                alert(`Le fichier "${file.name}" n'est pas un JPEG valide.`);
                processedFiles++;
                updateProgress((processedFiles / totalFiles) * 100);
                if (processedFiles === totalFiles) hideLoading();
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            fetch('compress.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error(`Invalid JSON response: ${text}`);
                }
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                const compressionRatio = ((1 - (data.compressedSize / data.originalSize)) * 100).toFixed(2);
                const resultElement = document.createElement('div');
                resultElement.className = 'bg-gray-800 rounded-lg shadow-md p-4 text-gray-200';
                resultElement.innerHTML = `
                    <img src="${data.base64Image}" alt="Compressed Image" class="w-full h-48 object-cover mb-2">
                    <p class="text-sm mb-1">Fichier: ${file.name}</p>
                    <p class="text-sm mb-1">Taille originale: ${(data.originalSize / 1024).toFixed(2)} KB</p>
                    <p class="text-sm mb-1">Taille compressée: ${(data.compressedSize / 1024).toFixed(2)} KB</p>
                    <p class="text-sm mb-2">Réduction: ${compressionRatio}%</p>
                    <a href="${data.base64Image}" download="${file.name.replace(/\.[^/.]+$/, '')}_compressed.jpg" class="bg-blue-500 text-white px-4 py-2 rounded-md inline-block text-sm">Télécharger</a>
                `;
                resultContainer.appendChild(resultElement);
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`Erreur lors de la compression de ${file.name}: ${error.message}`);
            })
            .finally(() => {
                processedFiles++;
                updateProgress((processedFiles / totalFiles) * 100);
                if (processedFiles === totalFiles) {
                    hideLoading();
                    downloadAllButton.style.display = 'inline-block';
                }
            });
        });
    }

    downloadAllButton.addEventListener('click', () => {
        const links = resultContainer.querySelectorAll('a[download]');
        if (links.length === 0) return;

        showLoading('Création du fichier ZIP...');
        const zip = new JSZip();
        const promises = [];

        links.forEach((link, index) => {
            const promise = fetch(link.href)
                .then(response => response.blob())
                .then(blob => {
                    const fileName = link.download || `compressed_image_${index + 1}.jpg`;
                    zip.file(fileName, blob);
                    updateProgress(((index + 1) / links.length) * 100);
                });
            promises.push(promise);
        });

        Promise.all(promises)
            .then(() => zip.generateAsync({ type: 'blob' }))
            .then(content => {
                const zipUrl = URL.createObjectURL(content);
                const downloadLink = document.createElement('a');
                downloadLink.href = zipUrl;
                downloadLink.download = 'compressed_images.zip';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            })
            .catch(error => {
                console.error('Error creating ZIP:', error);
                alert('Erreur lors de la création du fichier ZIP');
            })
            .finally(() => {
                hideLoading();
            });
    });
});





































