from setuptools import setup

setup(
    name='update_door',
    version='0.1',
    py_modules=['update_door'],
    install_requires=[
        'Click',
        'paho-mqtt',
    ],
    entry_points='''
        [console_scripts]
        update_door=update_door:cli
    ''',
)

setup(
    name='csv_logger',
    version='0.1',
    py_modules=['csv_logger'],
    install_requires=[
        'paho-mqtt',
    ],
    entry_points='''
        [console_scripts]
        csv_logger=csv_logger:main
    ''',
)