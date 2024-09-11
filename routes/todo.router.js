import express from 'express';
import joi, { valid } from 'joi';
import Todo from '../schemas/todo.schema.js';

const router = express.Router();

const createdTodoSchma = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/** 할일 등록 API **/
router.post('/todos', async (req, res, next) => {
  try {
    // 1. 클라이언트로 부터 받아온 value 데이터를 가져온다.
    const validation = await createdTodoSchma.validateAsync(req.body);

    const { value } = validation;

    // 1-5. 만약 클라이언트가 value 데이터를 전달하지 않았을 때,
    //      클라이언트에게 에러 메세지를 전달한다.
    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: '해야할 일(value) 데이터가 존재하지 않습니다.' });
    }

    // 2. 해당하는 마지막 order 데이터를 조회한다.
    // findOne = 1개의 데이터만 조회한다.
    // sort = 정렬한다, order앞에 -를 붙여 내림차순으로 정렬하는 것으로
    // 마지막 데이터를 조회한다.
    // exec를 붙이는 이유는 앞에 구문이 Promise로 동작하지않아 await을 사용할 수
    // 없어 요청을 보냈지만 실제 데이터가 언제 받아오는지 확실해지지 않는다.
    const todoMaxOrder = await Todo.findOne().sort('-order').exec();

    // 3. 만약 존재한다면 현재 해야 할 일을 +1 하고, order 데이터가 존재하지 않다면, 1로 할당한다
    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // 4. 해야할 일 등록

    // 인스턴스 형식으로 만들기
    const todo = new Todo({ value, order });
    // 실제로 데이터 베이스에 저장하기
    await todo.save();

    // 5. 해야할 일을 클라이언트에게 반환한다.
    return res.status(201).json({ todo: todo });
  } catch (error) {
    // Router 다음에 있는 에러 처리 미들웨어를 실행한다.
    next(error);
  }
});

/** 해야할 일 목록 조회 API **/
router.get('/todos', async (req, res) => {
  // 1. 해야할 일 목록 조회를 진행한다.
  const todos = await Todo.find().sort('-order').exec();

  // 2. 해야할 일 목록 조회 결과를 클라이언트에게 반환한다.
  return res.status(200).json({ todos: todos });
});

/** 해야할 일 순서 변경, 완료/해제API **/
router.patch('/todos/:todoId', async (req, res) => {
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  // 1. 현재 나의 order가 무엇인지 알아야 한다.
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: '존재하지 않는 해야할 일 입니다.' });
  }

  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }

    currentTodo.order = order;
  }

  if (done !== undefined) {
    currentTodo.doneAt = done ? new Date() : null;
  }

  if (value) {
    currentTodo.value = value;
  }

  await currentTodo.save();

  return res.status(200).json({});
});

/** 할 일 삭제 API **/
router.delete('/todos/:todoId', async (req, res) => {
  const { todoId } = req.params;

  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: '존재하지 않는 해야할 일 정보입니다.' });
  }

  await Todo.deleteOne({ _id: todoId });

  return res.status(200).json({});
});

export default router;
