// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {Quiz} from "../src/Quiz.sol";

contract QuizTest is Test {
    Quiz public quiz;
    uint8[] public answers;

    event QuizCompleted(address indexed user, uint256 score);

    function setUp() public {
        answers = new uint8[](3);
        answers[0] = 1;
        answers[1] = 2;
        answers[2] = 0;
        quiz = new Quiz(answers);
    }

    function testGetQuestionCount() public {
        assertEq(quiz.getQuestionCount(), 3);
    }

    function testSubmitAllCorrect() public {
        uint8[] memory userAnswers = new uint8[](3);
        userAnswers[0] = 1;
        userAnswers[1] = 2;
        userAnswers[2] = 0;

        vm.expectEmit(true, false, false, true);
        emit QuizCompleted(address(this), 3);
        
        quiz.submitAnswers(userAnswers);
    }

    function testSubmitPartialCorrect() public {
        uint8[] memory userAnswers = new uint8[](3);
        userAnswers[0] = 1; // Correct
        userAnswers[1] = 1; // Incorrect
        userAnswers[2] = 0; // Correct

        vm.expectEmit(true, false, false, true);
        emit QuizCompleted(address(this), 2);
        
        quiz.submitAnswers(userAnswers);
    }

    function testSubmitInvalidLength() public {
        uint8[] memory userAnswers = new uint8[](2);
        userAnswers[0] = 1;
        userAnswers[1] = 2;

        vm.expectRevert("Invalid number of answers");
        quiz.submitAnswers(userAnswers);
    }
}
