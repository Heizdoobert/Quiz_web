// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Quiz {
    // Array of correct answers (e.g., indices of the correct options)
    uint8[] public correctAnswers;

    event QuizCompleted(address indexed user, uint256 score);

    constructor(uint8[] memory _correctAnswers) {
        correctAnswers = _correctAnswers;
    }

    function getQuestionCount() public view returns (uint256) {
        return correctAnswers.length;
    }

    function submitAnswers(uint8[] calldata _userAnswers) public {
        require(_userAnswers.length == correctAnswers.length, "Invalid number of answers");

        uint256 score = 0;
        for (uint256 i = 0; i < correctAnswers.length; i++) {
            if (_userAnswers[i] == correctAnswers[i]) {
                score++;
            }
        }

        emit QuizCompleted(msg.sender, score);
    }
}
