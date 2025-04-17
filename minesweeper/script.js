const boardSize = 10;
const mineCount = 20;
let board = [];
let gameActive = true;
let firstClick = true;

const gameBoard = document.getElementById('game-board');
const statusText = document.getElementById('status');
const resetButton = document.getElementById('reset');

function createBoard(excludeRow, excludeCol) {
    // Initialize an empty board
    board = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => ({
            mine: false,
            revealed: false,
            flagged: false,
            adjacentMines: 0
        }))
    );

    // Place mines incrementally
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        const row = Math.floor(Math.random() * boardSize);
        const col = Math.floor(Math.random() * boardSize);

        if (
            !board[row][col].mine &&
            !(row === excludeRow && col === excludeCol) &&
            !isNeighbor(row, col, excludeRow, excludeCol)
        ) {
            // Temporarily place a mine
            board[row][col].mine = true;

            // Recalculate adjacent mines
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    if (!board[r][c].mine) {
                        board[r][c].adjacentMines = countAdjacentMines(r, c);
                    }
                }
            }

            // Check if the board is still solvable
            if (isSolvable()) {
                minesPlaced++;
            } else {
                // Undo the mine placement if it makes the board unsolvable
                board[row][col].mine = false;
            }
        }
    }

    // Recalculate adjacent mines for the final board
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (!board[row][col].mine) {
                board[row][col].adjacentMines = countAdjacentMines(row, col);
            }
        }
    }

    renderBoard();
}

function isSolvable() {
    const visited = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => false)
    );

    function canReveal(row, col) {
        if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) return false;
        if (visited[row][col] || board[row][col].mine) return false;

        visited[row][col] = true;

        // If the cell has no adjacent mines, recursively check its neighbors
        if (board[row][col].adjacentMines === 0) {
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],          [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            directions.forEach(([dx, dy]) => {
                canReveal(row + dx, col + dy);
            });
        }

        return true;
    }

    // Start from the first safe cell (excludeRow, excludeCol)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (!board[row][col].mine && !visited[row][col]) {
                canReveal(row, col);
            }
        }
    }

    // Check if all non-mine cells are visited
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (!board[row][col].mine && !visited[row][col]) {
                return false;
            }
        }
    }

    return true;
}

function isNeighbor(row, col, excludeRow, excludeCol) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    return directions.some(([dx, dy]) => {
        const newRow = excludeRow + dx;
        const newCol = excludeCol + dy;
        return row === newRow && col === newCol;
    });
}

function countAdjacentMines(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    return directions.reduce((count, [dx, dy]) => {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && board[newRow][newCol].mine) {
            return count + 1;
        }
        return count;
    }, 0);
}

function renderBoard() {
    gameBoard.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (board[row][col].revealed) {
                cell.classList.add('revealed');
                if (board[row][col].mine) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (board[row][col].adjacentMines > 0) {
                    cell.textContent = board[row][col].adjacentMines;
                }
            } else if (board[row][col].flagged) {
                cell.classList.add('flagged'); // Add the flagged class
                cell.textContent = '🚩'; // Show flag
            }

            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleRightClick); // Add right-click event
            gameBoard.appendChild(cell);
        }
    }
}

function handleCellClick(event) {
    if (!gameActive) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (firstClick) {
        createBoard(row, col); // Generate the board after the first click
        firstClick = false;
    }

    if (board[row][col].revealed) {
        // If the cell is a revealed number, check for adjacent flags
        if (board[row][col].adjacentMines > 0) {
            const adjacentFlags = countAdjacentFlags(row, col);
            if (adjacentFlags === board[row][col].adjacentMines) {
                revealSurroundingTiles(row, col);
            }
        }
        return; // Do nothing else for revealed cells
    }

    if (board[row][col].flagged) return; // Ignore flagged cells

    board[row][col].revealed = true;

    if (board[row][col].mine) {
        statusText.textContent = 'Game Over! You hit a mine!';
        gameActive = false;
        revealAllMines();
    } else {
        if (board[row][col].adjacentMines === 0) {
            revealAdjacentCells(row, col);
        }
        statusText.textContent = 'Keep going!';
    }

    renderBoard();
}

function countAdjacentFlags(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    return directions.reduce((count, [dx, dy]) => {
        const newRow = row + dx;
        const newCol = col + dy;
        if (
            newRow >= 0 && newRow < boardSize &&
            newCol >= 0 && newCol < boardSize &&
            board[newRow][newCol].flagged
        ) {
            return count + 1;
        }
        return count;
    }, 0);
}

function revealSurroundingTiles(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (
            newRow >= 0 && newRow < boardSize &&
            newCol >= 0 && newCol < boardSize &&
            !board[newRow][newCol].revealed &&
            !board[newRow][newCol].flagged
        ) {
            board[newRow][newCol].revealed = true;

            if (board[newRow][newCol].mine) {
                // End the game if a mine is revealed
                statusText.textContent = 'Game Over! You hit a mine!';
                gameActive = false;
                revealAllMines();
                return; // Stop further processing
            }

            // If the revealed cell has no adjacent mines, recursively reveal its neighbors
            if (board[newRow][newCol].adjacentMines === 0) {
                revealAdjacentCells(newRow, newCol);
            }
        }
    }

    renderBoard(); // Re-render the board to reflect the changes
}

function handleRightClick(event) {
    event.preventDefault(); // Prevent the default context menu

    if (!gameActive) return;

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (board[row][col].revealed) return; // Ignore revealed cells

    board[row][col].flagged = !board[row][col].flagged; // Toggle flagged state
    renderBoard(); // Re-render the board to show the flag
}

function revealAdjacentCells(row, col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (
            newRow >= 0 && newRow < boardSize &&
            newCol >= 0 && newCol < boardSize &&
            !board[newRow][newCol].revealed
        ) {
            board[newRow][newCol].revealed = true;

            if (board[newRow][newCol].mine) {
                // End the game if a mine is revealed
                statusText.textContent = 'Game Over! You hit a mine!';
                gameActive = false;
                revealAllMines();
                return; // Stop further processing
            }

            if (board[newRow][newCol].adjacentMines === 0) {
                revealAdjacentCells(newRow, newCol);
            }
        }
    }
}

function revealAllMines() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col].mine) {
                board[row][col].revealed = true;
            }
        }
    }
    renderBoard();
}

function resetGame() {
    gameActive = true;
    firstClick = true;
    statusText.textContent = 'Game in progress...';

    // Initialize an empty board
    board = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => ({
            mine: false,
            revealed: false,
            adjacentMines: 0
        }))
    );

    renderBoard(); // Render the empty board
}

resetButton.addEventListener('click', resetGame);

resetGame();
