function renderClassSelector() {
    const classSelector = document.getElementById('classSelector');
    classSelector.innerHTML = '';

    classes.forEach((classItem) => {
        // Create selector elements
        const classOption = document.createElement('div');
        classOption.className = 'class-option';

        const classNameInput = document.createElement('input');
        classNameInput.value = classItem.name;
        classNameInput.setAttribute('readonly', true);

        // Edit button
        const editButton = document.createElement('button');
        editButton.innerHTML = '✏️';
        editButton.onclick = () => {
            classNameInput.removeAttribute('readonly');
            saveButton.style.display = 'inline';
            cancelButton.style.display = 'inline';
        };

        // Save button
        const saveButton = document.createElement('button');
        saveButton.innerHTML = '💾';
        saveButton.style.display = 'none';
        saveButton.onclick = () => {
            const newName = classNameInput.value;
            if (classes.some(cls => cls.name === newName && cls.id !== classItem.id)) {
                alert('Class name already exists.');
                return;
            }
            classItem.name = newName;
            localStorage.setItem(`cdData_${classItem.id}_students`, JSON.stringify(getClassData(classItem.id))); // Auto migrate keys
            if (currentClassId === classItem.id) {
                currentClassId = newName;
            }
            saveButton.style.display = 'none';
            cancelButton.style.display = 'none';
            classNameInput.setAttribute('readonly', true);
            renderClassSelector();
        };

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.innerHTML = 'Cancel';
        cancelButton.style.display = 'none';
        cancelButton.onclick = () => {
            classNameInput.value = classItem.name;
            classNameInput.setAttribute('readonly', true);
            saveButton.style.display = 'none';
            cancelButton.style.display = 'none';
        };

        classOption.appendChild(classNameInput);
        classOption.appendChild(editButton);
        classOption.appendChild(saveButton);
        classOption.appendChild(cancelButton);
        classSelector.appendChild(classOption);
    });
}