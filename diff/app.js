(() => {
    let isDiffMode = false;

    const leftInput = document.getElementById('input-left');
    const rightInput = document.getElementById('input-right');
    const leftOutput = document.getElementById('output-left');
    const rightOutput = document.getElementById('output-right');
    const btn = document.getElementById('compare-btn');

    const statsContainer = document.getElementById('diff-stats');
    const addedTxt = document.getElementById('stat-added-txt');
    const removedTxt = document.getElementById('stat-removed-txt');
    const addedBar = document.getElementById('bar-added');
    const removedBar = document.getElementById('bar-removed');

    window.addEventListener('DOMContentLoaded', () => {
        const savedLeft = localStorage.getItem('comparator_left');
        const savedRight = localStorage.getItem('comparator_right');
        if (savedLeft) leftInput.value = savedLeft;
        if (savedRight) rightInput.value = savedRight;
    });

    leftInput.addEventListener('input', () => localStorage.setItem('comparator_left', leftInput.value));
    rightInput.addEventListener('input', () => localStorage.setItem('comparator_right', rightInput.value));

    btn.addEventListener('click', () => {
        const valLeft = leftInput.value;
        const valRight = rightInput.value;

        if (!isDiffMode) {
            const currentScrollTop = leftInput.scrollTop;
            const currentScrollLeft = leftInput.scrollLeft;

            const linesA = valLeft.split('\n');
            const linesB = valRight.split('\n');

            const htmlA = [];
            const htmlB = [];
            let addedCount = 0;
            let removedCount = 0;
            let operations = [];

            if (valLeft === valRight) {
                linesA.forEach(line => operations.push({ type: 'unchanged', text: line }));
            } else {
                const matrix = Array(linesA.length + 1).fill(null).map(() => Array(linesB.length + 1).fill(0));

                for (let x = 1; x <= linesA.length; x++) {
                    for (let y = 1; y <= linesB.length; y++) {
                        matrix[x][y] = (linesA[x - 1] === linesB[y - 1])
                            ? matrix[x - 1][y - 1] + 1
                            : Math.max(matrix[x - 1][y], matrix[x][y - 1]);
                    }
                }

                let x = linesA.length;
                let y = linesB.length;

                while (x > 0 || y > 0) {
                    if (x > 0 && y > 0 && linesA[x - 1] === linesB[y - 1]) {
                        operations.unshift({ type: 'unchanged', text: linesA[x - 1] });
                        x--; y--;
                    } else if (y > 0 && (x === 0 || matrix[x][y - 1] >= matrix[x - 1][y])) {
                        operations.unshift({ type: 'added', text: linesB[y - 1] });
                        addedCount++;
                        y--;
                    } else {
                        operations.unshift({ type: 'removed', text: linesA[x - 1] });
                        removedCount++;
                        x--;
                    }
                }
            }

            operations.forEach(op => {
                const escaped = escapeHtml(op.text);
                if (op.type === 'unchanged') {
                    const lineMarkup = `<span class="diff-line">${escaped || ' '}</span>`;
                    htmlA.push(lineMarkup);
                    htmlB.push(lineMarkup);
                } else if (op.type === 'added') {
                    htmlA.push(`<span class="diff-line empty">&nbsp;</span>`);
                    htmlB.push(`<span class="diff-line added">${escaped || ' '}</span>`);
                } else if (op.type === 'removed') {
                    htmlA.push(`<span class="diff-line removed">${escaped || ' '}</span>`);
                    htmlB.push(`<span class="diff-line empty">&nbsp;</span>`);
                }
            });

            const totalDiffs = addedCount + removedCount;
            const addedPct = totalDiffs > 0 ? (addedCount / totalDiffs) * 100 : 0;
            const removedPct = totalDiffs > 0 ? (removedCount / totalDiffs) * 100 : 0;

            addedTxt.innerText = `+${addedCount}`;
            removedTxt.innerText = `-${removedCount}`;

            addedBar.style.width = totalDiffs === 0 ? '0%' : `${addedPct}%`;
            removedBar.style.width = totalDiffs === 0 ? '0%' : `${removedPct}%`;

            leftOutput.innerHTML = htmlA.join('');
            rightOutput.innerHTML = htmlB.join('');

            toggleVisibility(true);

            leftOutput.scrollTop = currentScrollTop;
            leftOutput.scrollLeft = currentScrollLeft;
            rightOutput.scrollTop = currentScrollTop;
            rightOutput.scrollLeft = currentScrollLeft;

            btn.innerText = "Edit Code";
            isDiffMode = true;
        } else {
            const currentScrollTop = leftOutput.scrollTop;
            const currentScrollLeft = leftOutput.scrollLeft;

            toggleVisibility(false);

            leftInput.scrollTop = currentScrollTop;
            leftInput.scrollLeft = currentScrollLeft;
            rightInput.scrollTop = currentScrollTop;
            rightInput.scrollLeft = currentScrollLeft;

            btn.innerText = "Check Diff";
            isDiffMode = false;
        }
    });

    function toggleVisibility(showDiff) {
        const container = document.querySelector('.container');

        leftInput.style.display = showDiff ? 'none' : 'block';
        rightInput.style.display = showDiff ? 'none' : 'block';
        leftOutput.style.display = showDiff ? 'block' : 'none';
        rightOutput.style.display = showDiff ? 'block' : 'none';
        statsContainer.style.display = showDiff ? 'flex' : 'none';

        if (showDiff) {
            container.classList.add('diff-mode-active');
            btn.classList.add('editing-state');
        } else {
            container.classList.remove('diff-mode-active');
            btn.classList.remove('editing-state');
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function syncScroll(el1, el2) {
        let isScrolling = false;
        el1.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                el2.scrollTop = el1.scrollTop;
                el2.scrollLeft = el1.scrollLeft;
                // Throttles the unlock to match the monitor refresh rate
                requestAnimationFrame(() => { isScrolling = false; });
            }
        }, { passive: true }); // Prevents scrolling block delays
    }

    syncScroll(leftInput, rightInput);
    syncScroll(rightInput, leftInput);
    syncScroll(leftOutput, rightOutput);
    syncScroll(rightOutput, leftOutput);
})();