import ResponseApi from "../helpers/response.js";
import Category from "../models/Category.model.js";
import NotificationService from "../services/NotificationService.js";


export const createCategory = async (req, res) => {
  try {
    const { nom, description, icone, isActive } = req.body;

    const existingCategory = await Category.findOne({
      nom: { $regex: new RegExp(`^${nom}$`, "i") },
    });

    if (existingCategory) {
      return ResponseApi.error(res, "Cette catégorie existe déjà", null, 409);
    }

    const category = await Category.create({
      nom,
      description: description || "",
      icone: icone || "📦",
      isActive: isActive !== undefined ? isActive : true,
    });

    NotificationService.broadcastNotification(
      'Nouvelle Catégorie',
      `La catégorie "${nom}" a été créée avec succès`,
      'info',
      `/categories/${category._id}`
    );

    ResponseApi.success(res, "Catégorie créée avec succès", category, 201);
  } catch (error) {
    console.error("Erreur création catégorie:", error);

    if (error.code === 11000) {
      return ResponseApi.error(
        res,
        "Cette catégorie existe déjà",
        { field: "nom" },
        409
      );
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return ResponseApi.error(res, "Erreur de validation", errors, 400);
    }

    ResponseApi.error(
      res,
      "Échec de la création de la catégorie",
      error.message
    );
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    ResponseApi.success(
      res,
      "Catégories récupérées avec succès",
      categories
    );
  } catch (error) {
    console.error("Erreur recuperation catégorie:", error);

    ResponseApi.error(
      res,
      "Échec de recuperation de la catégorie",
      error.message
    );
  }
};


export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) {
            return ResponseApi.notFound(res, "Catégorie non trouvée");
        }
        ResponseApi.success(res, "Catégorie récupérée avec succès", category);
    } catch (error) {
        console.error("Erreur récupération catégorie par ID:", error);
        ResponseApi.error(res, "Échec de la récupération de la catégorie", error.message);
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await Category.findByIdAndDelete(id);
        
        if (!category) {
            return ResponseApi.notFound(res, "Catégorie non trouvée");
        }
        
        NotificationService.broadcastNotification(
          'Catégorie Supprimée',
          `La catégorie "${category.nom}" a été supprimée`,
          'warning'
        );
        
        ResponseApi.success(res, "Catégorie supprimée avec succès", category);
    } catch (error) {
        console.error("Erreur suppression catégorie:", error); 

        ResponseApi.error(
            res,
            "Échec de la suppression de la catégorie",
            error.message
        );
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, description, icone, isActive } = req.body;
        
        const category = await Category.findById(id);
        if (!category) {
            return ResponseApi.notFound(res, "Catégorie non trouvée");
        }
        
        if (nom && nom !== category.nom) {
            const existingCategory = await Category.findOne({
                nom: { $regex: new RegExp(`^${nom}$`, "i") },
                _id: { $ne: id }
            });
            
            if (existingCategory) {
                return ResponseApi.error(res, "Cette catégorie existe déjà", null, 409);
            }
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            {
                nom: nom || category.nom,
                description: description !== undefined ? description : category.description,
                icone: icone || category.icone,
                isActive: isActive !== undefined ? isActive : category.isActive
            },
            { new: true, runValidators: true }
        );
        
        NotificationService.broadcastNotification(
          'Catégorie Mise à Jour',
          `La catégorie "${category.nom}" a été renommée en "${updatedCategory.nom}"`,
          'info',
          `/categories/${id}`
        );
        
        ResponseApi.success(res, "Catégorie mise à jour avec succès", updatedCategory);
    } catch (error) {
        console.error("Erreur mise à jour catégorie:", error);
        
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return ResponseApi.error(res, "Erreur de validation", errors, 400);
        }
        
        if (error.code === 11000) {
            return ResponseApi.error(res, "Cette catégorie existe déjà", { field: "nom" }, 409);
        }
        
        ResponseApi.error(
            res,
            "Échec de la mise à jour de la catégorie",
            error.message
        );
    }
};