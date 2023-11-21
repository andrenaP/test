import { ctrlWrapper } from "../decorators/index.js";
import HttpError from "../helpers/HttpError.js";
import { Diary } from "../models/Diary.js";
import Exercise from "../models/Exercise.js";
import Product from "../models/Product.js";

const addDiary = async (req, res) => {
  const { _id: owner, blood } = req.user;
  const { date } = req.params;
  const { doneExercises, consumedProducts } = req.body;

  const conditions = { owner, date };
  const update = {};
  let burnedCalories = 0;
  let consumedCalories = 0;

  if (doneExercises && doneExercises.length > 0) {
    const updatedDoneExercises = [];
    for (const exerciseObj of doneExercises) {
      const { exercise, time, calories } = exerciseObj;
      const foundExercise = await Exercise.findById(exercise);

      if (!foundExercise) {
        throw HttpError(404, "These is no such exercise");
      }

      const newExercise = {
        exercise,
        time,
        calories,
        bodyPart: foundExercise.bodyPart,
        equipment: foundExercise.equipment,
        name: foundExercise.name,
        target: foundExercise.target,
      };

      updatedDoneExercises.push(newExercise);
      burnedCalories += calories;
    }
    update.$addToSet = { doneExercises: { $each: updatedDoneExercises } };
  }

  if (consumedProducts && consumedProducts.length > 0) {
    const updatedConsumedProducts = [];
    for (const productObj of consumedProducts) {
      const { product, amount, calories } = productObj;
      const foundProduct = await Product.findById(product);

      if (!foundProduct) {
        throw HttpError(404, "These is no such product");
      }

      const newProduct = {
        product,
        amount,
        calories,
        title: foundProduct.title,
        category: foundProduct.category,
        groupBloodNotAllowed: foundProduct.groupBloodNotAllowed[blood],
      };

      updatedConsumedProducts.push(newProduct);
      consumedCalories += calories;
    }
    update.$addToSet = { consumedProducts: { $each: updatedConsumedProducts } };
  }

  update.$inc = { burnedCalories, consumedCalories };

  const options = { new: true, upsert: true };
  const result = await Diary.findOneAndUpdate(conditions, update, options);

  res.status(200).json(result);
};

const updateDiary = async (req, res) => {
  const { date } = req.params;
  const { _id: owner } = req.user;
  const { type, id } = req.body;
  const diary = await Diary.findOne({ owner, date });

  if (!diary) {
    throw HttpError(404, "Diary not found");
  }

  let arrayType;
  let update;

  if (type === "exercise") {
    const doneExerciseIndex = diary.doneExercises.findIndex(
      (item) => item._id && item._id.toString() === id
    );

    if (doneExerciseIndex === -1) {
      throw HttpError(404, "Exercise not found");
    } else {
      arrayType = "doneExercises";
      update = {
        $pull: { doneExercises: { _id: id } },
        $inc: {
          burnedCalories: -diary.doneExercises[doneExerciseIndex].calories,
        },
      };
    }
  } else if (type === "product") {
    const consumedProductIndex = diary.consumedProducts.findIndex(
      (item) => item._id && item._id.toString() === id
    );

    if (consumedProductIndex === -1) {
      throw HttpError(404, "Product not found");
    } else {
      arrayType = "consumedProducts";
      update = {
        $pull: { consumedProducts: { _id: id } },
        $inc: {
          consumedCalories:
            -diary.consumedProducts[consumedProductIndex].calories,
        },
      };
    }
  } else {
    throw HttpError(404, "Type of object is not defined");
  }

  const result = await Diary.findOneAndUpdate({ owner, date }, update, {
    new: true,
  });

  res.status(200).json(result);
};

const getDiary = async (req, res) => {
  const { _id: owner, createdAt } = req.user;
  const { date } = req.params;

  let result = await Diary.findOne({ owner, date });

  if (!result) {
    try {
      const basicSettings = {
        doneExercises: [],
        consumedProducts: [],
        burnedCalories: 0,
        consumedCalories: 0,
      };
      result = await Diary.create({ owner, date, ...basicSettings });
      res.status(201).json(result);
    } catch (error) {
      throw HttpError(500, "Failed to create diary entry");
    }
  } else {
    res.status(200).json(result);
  }
};

export default {
  addDiary: ctrlWrapper(addDiary),
  updateDiary: ctrlWrapper(updateDiary),
  getDiary: ctrlWrapper(getDiary),
};
