const User = require("../models/user.model");

/* CREATE */
exports.createUser = async (req, res) => {
    try {
        const newUser = new User({
             email : req.body.email,
            password: req.body.password, // TODO : Hachage de mot de passe à prévoir
            isAdmin: req.body.isAdmin,
        });

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la création de ma bite' });
    }
};


/* GET */

exports.getAll = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Erreur lors de la récupération des utilisateurs'});
    }
}

exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
    }
};

/* UPDATE */

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const {email,password } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {email, password },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
};


/* DELETE */

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
    }
};
