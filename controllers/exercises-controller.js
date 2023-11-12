import Exercise from "../models/Exercise.js";
import { ctrlWrapper } from "../decorators/index.js";

const getAllExercises = async (req, res) => {
  const exercises = await Exercise.find();

  res.json(exercises);
};
const getAllExercisesTypes = async (req, res) => {
  const exercises = await Exercise.find(
    {},
    { bodyPart: 1, equipment: 1, target: 1 }
  );
  res.json(exercises);
};

export default {
  getAllExercises: ctrlWrapper(getAllExercises),
  getAllExercisesTypes: ctrlWrapper(getAllExercisesTypes),
};
