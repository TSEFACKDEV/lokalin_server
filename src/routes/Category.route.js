import express from 'express';
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from '../controllers/Category.controller.js';


const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategoryById);


router.post('/',createCategory);
router.put('/:id',updateCategory);
router.delete('/:id',deleteCategory);

export default router;