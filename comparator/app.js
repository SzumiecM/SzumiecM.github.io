let isDiffMode = false;

const leftInput = document.getElementById('input-left');
const rightInput = document.getElementById('input-right');
const leftOutput = document.getElementById('output-left');
const rightOutput = document.getElementById('output-right');
const btn = document.getElementById('compare-btn');

// Stats Elements
const statsContainer = document.getElementById('diff-stats');
const addedTxt = document.getElementById('stat-added-txt');
const removedTxt = document.getElementById('stat-removed-txt');
const addedBar = document.getElementById('bar-added');
const removedBar = document.getElementById('bar-removed');

// --- 1. LOCAL STORAGE: LOAD STATE ---
window.addEventListener('DOMContentLoaded', () => {
    const savedLeft = localStorage.getItem('comparator_left');
    const savedRight = localStorage.getItem('comparator_right');
    
    if (savedLeft) leftInput.value = savedLeft;
    if (savedRight) rightInput.value = savedRight;
});

// --- 2. LOCAL STORAGE: SAVE STATE ON TYPE ---
leftInput.addEventListener('input', () => {
    localStorage.setItem('comparator_left', leftInput.value);
});
rightInput.addEventListener('input', () => {
    localStorage.setItem('comparator_right', rightInput.value);
});

// --- 3. DIFF CORE ENGINE ---
btn.addEventListener('click', () => {
    if (!isDiffMode) {
        const linesA = leftInput.value.split('\n');
        const linesB = rightInput.value.split('\n');

        const htmlA = [];
        const htmlB = [];
        
        let addedCount = 0;
        let removedCount = 0;

        // Longest Common Subsequence Matrix
        const matrix = Array(linesA.length + 1).fill(null).map(() => Array(linesB.length + 1).fill(0));
        
        for (let x = 1; x <= linesA.length; x++) {
            for (let y = 1; y <= linesB.length; y++) {
                if (linesA[x - 1] === linesB[y - 1]) {
                    matrix[x][y] = matrix[x - 1][y - 1] + 1;
                } else {
                    matrix[x][y] = Math.max(matrix[x - 1][y], matrix[x][y - 1]);
                }
            }
        }

        let x = linesA.length;
        let y = linesB.length;
        const operations = [];

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

        operations.forEach(op => {
            const escaped = escapeHtml(op.text);
            if (op.type === 'unchanged') {
                htmlA.push(`<span class="diff-line">${escaped || ' '}</span>`);
                htmlB.push(`<span class="diff-line">${escaped || ' '}</span>`);
            } else if (op.type === 'added') {
                htmlA.push(`<span class="diff-line empty">&nbsp;</span>`);
                htmlB.push(`<span class="diff-line added">${escaped || ' '}</span>`);
            } else if (op.type === 'removed') {
                htmlA.push(`<span class="diff-line removed">${escaped || ' '}</span>`);
                htmlB.push(`<span class="diff-line empty">&nbsp;</span>`);
            }
        });

        // Calculate Visual Ratio Percentages
        const totalDiffs = addedCount + removedCount;
        let addedPct = 0;
        let removedPct = 0;

        if (totalDiffs > 0) {
            addedPct = (addedCount / totalDiffs) * 100;
            removedPct = (removedCount / totalDiffs) * 100;
        }

        addedTxt.innerText = `+${addedCount}`;
        removedTxt.innerText = `-${removedCount}`;
        
        if (totalDiffs === 0) {
            addedBar.style.width = '0%';
            removedBar.style.width = '0%';
        } else {
            addedBar.style.width = `${addedPct}%`;
            removedBar.style.width = `${removedPct}%`;
        }

        leftOutput.innerHTML = htmlA.join('');
        rightOutput.innerHTML = htmlB.join('');

        leftInput.style.display = 'none';
        rightInput.style.display = 'none';
        leftOutput.style.display = 'block';
        rightOutput.style.display = 'block';
        statsContainer.style.display = 'flex';

        btn.innerText = "Edit Code";
        isDiffMode = true;
    } else {
        leftInput.style.display = 'block';
        rightInput.style.display = 'block';
        leftOutput.style.display = 'none';
        rightOutput.style.display = 'none';
        statsContainer.style.display = 'none';

        btn.innerText = "Compare Diffs";
        isDiffMode = false;
    }
});

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- 4. UNIFIED SCROLL SYNC ENGINE ---
function syncScroll(el1, el2) {
    let isScrolling = false;
    el1.addEventListener('scroll', () => {
        if (!isScrolling) {
            isScrolling = true;
            el2.scrollTop = el1.scrollTop;
            el2.scrollLeft = el1.scrollLeft;
            setTimeout(() => { isScrolling = false; }, 0);
        }
    });
}

syncScroll(leftInput, rightInput);
syncScroll(rightInput, leftInput);
syncScroll(leftOutput, rightOutput);
syncScroll(rightOutput, leftOutput);