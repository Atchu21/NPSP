from abc import ABC, abstractmethod
from importlib import import_module

from factory import enums, base

from .data_generation_base import BatchDataTask


#  Factoryboy uses "__" and Salesforce uses "__". Luckily Factoryboy makes
#  theirs easy to override!
enums.SPLITTER = "____"


# More flexible than FactoryBoy's sequences because you can create and
# destroy them where-ever you want.
class Adder:
    def __init__(self, x=0):
        self.x = x

    def __call__(self, value):
        self.x += value
        return int(self.x)

    def reset(self, x):
        self.x = x


# Thin collector for the factories and a place to try to achieve better
# scalability than the create_batch function from FactoryBoy.
class Factories:
    def __init__(self, session, orm_classes, collection):
        """Add a session to factories and then store them."""

        self.factory_classes = {
            key: self.add_session(value, session, orm_classes)
            for key, value in collection.items()
        }

    @staticmethod
    def add_session(fact, session, orm_classes):
        "Attach the session to the factory"
        fact._meta.sqlalchemy_session = session
        fact._meta.sqlalchemy_session_persistence = "commit"

        # if the model is just a string name, find a real class that matches
        # that name
        if isinstance(fact._meta.model, str):
            fact._meta.model = orm_classes[fact._meta.model]

        return fact

    def create_batch(self, classname, batchsize, **kwargs):
        cls = self.factory_classes.get(classname, None)
        assert cls, f"Cannot find a factory class named {classname}. Did you misspell it?"
        for _ in range(batchsize):
            cls.create(**kwargs)

    def __getitem__(self, name):
        return self.factory_classes[name]


class BaseDataFactory(BatchDataTask, ABC):
    """Abstract base class for any FactoryBoy based generator"""
    def generate_data(self, session, engine, base, num_records):
        raw_factories = self.make_factories(base.classes)
        factories = Factories(session, base.classes, raw_factories)
        self.make_records(num_records, factories)
        session.flush()
        session.close()

    @abstractmethod
    def make_factories(self, classes):
        pass

    @abstractmethod
    def make_records(self, num_records, factories):
        pass


class ModuleDataFactory(BaseDataFactory):
    datafactory_classes_module = None
    # override to nominate a module to serve as the collection of modules

    def make_factories(self, classes):
        if not self.datafactory_classes_module:
            # by default look for classes in the same place that the derived class came from
            self.datafactory_classes_module = self.__module__
        module = import_module(self.datafactory_classes_module)
        module_contents = vars(module)

        # filter out other cruft from the file
        factories = {name: f
                     for name, f in module_contents.items()
                     if isinstance(f, base.FactoryMetaClass)}

        return factories


class _Models:
    """Stand in for the models module of a framework like Django"""
    def __getattr__(self, name):
        # Instead of returning model objects, return strings as stand-ins.
        # Later we'll replace the strings with real model objects after
        # doing the mapping.yml introspection.
        return name


Models = _Models()
